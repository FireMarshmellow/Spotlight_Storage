import os
import sys
import tempfile

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

# db.py creates ./data/combined_data.db (and runs migrations) at import time.
# Import it from a throwaway directory so tests never touch real data.
_IMPORT_DIR = tempfile.mkdtemp(prefix='spotlight-tests-')
_ORIGINAL_CWD = os.getcwd()
os.chdir(_IMPORT_DIR)
import db  # noqa: E402
import app as app_module  # noqa: E402
os.chdir(_ORIGINAL_CWD)


@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch):
    """Every test gets its own empty database file."""
    monkeypatch.setattr(db, 'COMBINED_DATABASE', str(tmp_path / 'data' / 'combined_data.db'))
    db.create_combined_db().close()
    app_module.app.previous_positions = []
    app_module.app.delSegments = ""
    yield


class WledRecorder:
    """Stands in for the WLED HTTP API and records every JSON state payload."""

    def __init__(self):
        self.calls = []

    def send(self, ip, data, timeout=0.2):
        self.calls.append((ip, data))

    def lit(self):
        """(index, colour) pairs from payloads that switch individual LEDs on.

        set_leds sends: off -> on-with-colours -> (after timeout) standby.
        The first per-LED payload after the initial 'off' is the locate one.
        """
        for _, data in self.calls:
            seg = data.get('seg')
            if data.get('on') and isinstance(seg, dict) and seg.get('i'):
                values = seg['i']
                return [(values[n], values[n + 1]) for n in range(0, len(values), 2)]
        return []


@pytest.fixture
def wled(monkeypatch):
    recorder = WledRecorder()
    monkeypatch.setattr(app_module, 'send_request', recorder.send)
    monkeypatch.setattr(app_module, 'get_total_leds', lambda ip: 10)
    monkeypatch.setattr(app_module.time, 'sleep', lambda s: None)

    class SyncThread:
        """Run 'background' locate threads inline so tests are deterministic."""

        def __init__(self, target, args=(), kwargs=None, daemon=None):
            self.target, self.args, self.kwargs = target, args, kwargs or {}

        def start(self):
            self.target(*self.args, **self.kwargs)

    monkeypatch.setattr(app_module.threading, 'Thread', SyncThread)
    return recorder


@pytest.fixture
def client():
    app_module.app.config['TESTING'] = True
    with app_module.app.test_client() as c:
        yield c


def make_esp(name='Box', ip='10.0.0.5', rows=9, cols=5, start_top='Top', start_left='Left',
             serpentine='Horizontal', row_layout='', locate_colors=None):
    return db.write_esp_settings({
        'name': name, 'esp_ip': ip, 'rows': rows, 'cols': cols,
        'startTop': start_top, 'startLeft': start_left, 'serpentineDirection': serpentine,
        'rowLayout': row_layout, 'locateColors': locate_colors or [],
    })


def make_item(name='Resistor 10k', position='[1]', quantity=5, ip='10.0.0.5', tags='[]',
              article_number='', storage_location='', link='', image=''):
    return db.write_item({
        'name': name, 'link': link, 'image': image, 'position': position, 'quantity': quantity,
        'ip': ip, 'tags': tags, 'article_number': article_number, 'storage_location': storage_location,
    })
