// Page start-up that used to live in inline <script>/onclick attributes.
// Kept in a file so the Content-Security-Policy can forbid inline scripts.
document.querySelectorAll('[data-sort]').forEach(link => {
    link.addEventListener('click', event => {
        event.preventDefault();
        sortItems(link.dataset.sort);
    });
});

document.querySelectorAll('[data-reset-item-modal]').forEach(button => {
    button.addEventListener('click', () => resetModal());
});

document.getElementById('export-button').addEventListener('click', event => {
    event.preventDefault();
    downloadWithToken('/api/export', 'spotlight-storage-backup.json')
        .catch(error => alert(`Export failed: ${error.message}`));
});

lucide.createIcons();
