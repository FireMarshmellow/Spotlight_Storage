"""The backend sends LED n to strip index n-1, which is only right if the UI grid
numbers cells in physical strip order. Check that for regular grids and for
uneven drawer layouts by running the pure functions from gen_grid.js in Node."""
import json
import os
import shutil
import subprocess

import pytest

GEN_GRID = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'gen_grid.js')
node = shutil.which('node')
pytestmark = pytest.mark.skipif(node is None, reason='Node.js not installed')


def extract_function(source, name):
    start = source.index(f'function {name}(')
    depth, i = 0, source.index('{', start)
    while True:
        if source[i] == '{':
            depth += 1
        elif source[i] == '}':
            depth -= 1
            if depth == 0:
                return source[start:i + 1]
        i += 1


def run_js(body):
    source = open(GEN_GRID, encoding='utf-8').read()
    functions = '\n'.join(extract_function(source, n)
                          for n in ('calculateLedNumber', 'parseRowLayout', 'computeLayoutNumbers'))
    result = subprocess.run([node, '-e', functions + '\n' + body], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def assert_strip_order(cells, expected_start):
    """cells: {number: (lane, slot) or (row, col)}; consecutive LEDs must be neighbours."""
    numbers = sorted(cells)
    assert numbers == list(range(1, len(numbers) + 1))
    assert cells[1] == expected_start


CORNERS = [(sx, sy, d) for sx in ('left', 'right') for sy in ('top', 'bottom') for d in ('horizontal', 'vertical')]


def test_regular_grid_numbering_follows_the_strip():
    out = run_js('''
        const res = [];
        for (const rows of [1, 2, 3, 9]) for (const cols of [1, 2, 5, 6])
        for (const sx of ["left","right"]) for (const sy of ["top","bottom"]) for (const d of ["horizontal","vertical"]) {
            const cells = {};
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
                cells[calculateLedNumber(r, c, sx, sy, d, rows, cols)] = [r, c];
            res.push({rows, cols, sx, sy, d, cells});
        }
        console.log(JSON.stringify(res));
    ''')
    for case in out:
        cells = {int(k): tuple(v) for k, v in case['cells'].items()}
        start = (0 if case['sy'] == 'top' else case['rows'] - 1, 0 if case['sx'] == 'left' else case['cols'] - 1)
        assert_strip_order(cells, start)
        for n in range(1, len(cells)):
            (r1, c1), (r2, c2) = cells[n], cells[n + 1]
            assert abs(r1 - r2) + abs(c1 - c2) == 1, (case['rows'], case['cols'], case['sx'], case['sy'], case['d'], n)


def test_layout_matches_regular_grid_when_rows_are_even():
    # A uniform layout must number exactly like the classic grid
    out = run_js('''
        const res = [];
        for (const sx of ["left","right"]) for (const sy of ["top","bottom"]) for (const d of ["horizontal","vertical"]) {
            const rows = 4, cols = 3;
            const layout = d === "horizontal" ? Array(rows).fill(cols) : Array(cols).fill(rows);
            const mismatches = computeLayoutNumbers(layout, sx, sy, d).filter(c => {
                const [r, col] = d === "horizontal" ? [c.lane, c.slot] : [c.slot, c.lane];
                return calculateLedNumber(r, col, sx, sy, d, rows, cols) !== c.number;
            });
            res.push(mismatches.length);
        }
        console.log(JSON.stringify(res));
    ''')
    assert out == [0] * len(CORNERS)


def test_uneven_layout_from_feature_request():
    # 5 rows of 6 drawers + 2 rows of 3, wired from top-left, horizontal serpentine
    out = run_js('console.log(JSON.stringify(computeLayoutNumbers([6,6,6,6,6,3,3], "left", "top", "horizontal")));')
    cells = {c['number']: (c['lane'], c['slot']) for c in out}
    assert len(cells) == 36
    assert_strip_order(cells, (0, 0))
    assert cells[6] == (0, 5) and cells[7] == (1, 5)      # serpentine turn
    # Row 5 (index 4) runs left->right and ends on the right, so the first short
    # row is entered from the right
    assert cells[30] == (4, 5) and cells[31] == (5, 2)
    assert cells[33] == (5, 0) and cells[34] == (6, 0) and cells[36] == (6, 2)
    # Within each lane consecutive numbers are adjacent slots
    for n in range(1, 36):
        (l1, s1), (l2, s2) = cells[n], cells[n + 1]
        assert (l1 == l2 and abs(s1 - s2) == 1) or abs(l1 - l2) == 1


def test_uneven_layout_every_start_corner():
    out = run_js('''
        const res = {};
        for (const sx of ["left","right"]) for (const sy of ["top","bottom"]) for (const d of ["horizontal","vertical"])
            res[[sx, sy, d].join("-")] = computeLayoutNumbers([4, 2, 3], sx, sy, d);
        console.log(JSON.stringify(res));
    ''')
    for key, cells in out.items():
        sx, sy, d = key.split('-')
        by_number = {c['number']: (c['lane'], c['slot']) for c in cells}
        first_lane_from_end = (sy == 'bottom') if d == 'horizontal' else (sx == 'right')
        slot_from_end = (sx == 'right') if d == 'horizontal' else (sy == 'bottom')
        lane = 2 if first_lane_from_end else 0
        slot = ([4, 2, 3][lane] - 1) if slot_from_end else 0
        assert_strip_order(by_number, (lane, slot))


def test_parse_row_layout():
    out = run_js('console.log(JSON.stringify(['
                 'parseRowLayout("6,6,3"), parseRowLayout(" 6 ; 3 "), parseRowLayout(""),'
                 'parseRowLayout("6,0"), parseRowLayout("6,x"), parseRowLayout(null)]));')
    assert out == [[6, 6, 3], [6, 3], None, None, None, None]
