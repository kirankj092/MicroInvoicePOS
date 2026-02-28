/**
 * script.js - Vanilla JavaScript for Micro Invoice POS
 * Interacts with api.php for full CRUD operations.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('invoiceForm');
    const priceInput = document.getElementById('price');
    const quantityInput = document.getElementById('quantity');
    const totalDisplay = document.getElementById('totalDisplay');
    const invoiceList = document.getElementById('invoiceList');
    const emptyState = document.getElementById('emptyState');
    const statusMessage = document.getElementById('statusMessage');
    const saveBtn = document.getElementById('saveBtn');
    const formPreviewBtn = document.getElementById('formPreviewBtn');
    const formDownloadBtn = document.getElementById('formDownloadBtn');
    const formShareBtn = document.getElementById('formShareBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) console.log("Logout button initialized");

    let editingId = null;

    // Fetch User Info
    const fetchUserInfo = async () => {
        try {
            const response = await fetch('auth_api.php?action=check');
            const data = await response.json();
            if (data.authenticated) {
                userNameDisplay.textContent = `Welcome, ${data.username}`;
            }
        } catch (error) {
            console.log("Auth check skipped in preview");
        }
    };

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to logout?')) return;
            try {
                await fetch('auth_api.php?action=logout');
                window.location.href = 'auth.html';
            } catch (error) {
                console.error("Logout failed:", error);
                window.location.href = 'auth.html';
            }
        });
    }

    // Fetch Invoices (Read)
    const fetchInvoices = async () => {
        try {
            const response = await fetch('api.php?action=read');
            if (response.status === 401) {
                window.location.href = 'auth.html';
                return;
            }
            if (!response.ok) {
                let errorMsg = 'Server Error ' + response.status;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.details || errorMsg;
                } catch (e) {
                    // If not JSON, get raw text
                    const rawText = await response.text();
                    if (rawText) errorMsg = rawText.substring(0, 200);
                }
                throw new Error(errorMsg);
            }
            
            let invoices;
            const responseText = await response.text();
            try {
                invoices = JSON.parse(responseText);
            } catch (e) {
                console.error('JSON Parse Error. Raw response:', responseText);
                throw new Error("Server returned invalid data. Raw response: " + responseText.substring(0, 300));
            }
            renderInvoices(invoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.textContent = 'Connection Error: ' + error.message + ' (Try Ctrl+F5 to clear cache)';
            }
        }
    };

    // Render Invoices
    const renderInvoices = (invoices) => {
        invoiceList.innerHTML = '';
        
        if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
            emptyState.style.display = 'block';
            if (invoices && invoices.error) {
                emptyState.textContent = `Error: ${invoices.error}`;
            } else {
                emptyState.textContent = 'No invoices recorded yet.';
            }
            return;
        }

        emptyState.style.display = 'none';
        
        invoices.forEach(inv => {
            const row = document.createElement('tr');
            const date = new Date(inv.created_at).toLocaleDateString();
            
            row.innerHTML = `
                <td style="font-family: monospace; color: #64748b;">${date}</td>
                <td style="font-weight: 500;">${inv.customer_name}</td>
                <td>${inv.item_name} <span style="color: #94a3b8; font-size: 0.75rem;">x${inv.quantity}</span></td>
                <td class="text-right text-bold" style="color: #1e4e8c;">$${parseFloat(inv.total).toFixed(2)}</td>
                <td class="text-right">
                    <button class="btn-icon preview-btn" data-id="${inv.id}" title="Preview PNG">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon download-btn" data-id="${inv.id}" title="Download PNG">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </button>
                    <button class="btn-icon share-btn" data-id="${inv.id}" title="Share Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                    </button>
                    <button class="btn-icon edit-btn" data-id="${inv.id}" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button class="btn-icon delete-btn" data-id="${inv.id}" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </td>
            `;
            invoiceList.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => handleEdit(btn.dataset.id, invoices));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDelete(btn.dataset.id));
        });
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', () => handlePreview(btn.dataset.id, invoices));
        });
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDownload(btn.dataset.id, invoices));
        });
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => handleShare(btn.dataset.id, invoices));
        });
    };

    // PNG Generation Logic
    const generateInvoiceCanvas = async (invoice) => {
        const tpl = document.getElementById('invoiceTemplate');
        document.getElementById('tpl-id').textContent = invoice.id;
        document.getElementById('tpl-date').textContent = new Date(invoice.created_at).toLocaleDateString();
        document.getElementById('tpl-customer').textContent = invoice.customer_name;
        document.getElementById('tpl-item').textContent = invoice.item_name;
        document.getElementById('tpl-qty').textContent = invoice.quantity;
        document.getElementById('tpl-price').textContent = `$${parseFloat(invoice.price).toFixed(2)}`;
        document.getElementById('tpl-total').textContent = `$${parseFloat(invoice.total).toFixed(2)}`;
        document.getElementById('tpl-grand-total').textContent = `$${parseFloat(invoice.total).toFixed(2)}`;

        return await html2canvas(tpl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
    };

    // Handle Preview
    const handlePreview = async (id, invoices, directData = null) => {
        const inv = directData || invoices.find(i => i.id == id);
        if (!inv) return;

        // Open window immediately to avoid popup blocker
        const newTab = window.open('', '_blank');
        if (!newTab) {
            showStatus('Popup blocked! Please allow popups.', 'error');
            return;
        }
        newTab.document.write('<p style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating your invoice preview...</p>');

        try {
            showStatus('Generating preview...', 'success');
            const canvas = await generateInvoiceCanvas(inv);
            const imgData = canvas.toDataURL('image/png');
            
            newTab.document.body.innerHTML = `<img src="${imgData}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1);">`;
            newTab.document.title = `Invoice Preview - ${inv.customer_name}`;
        } catch (error) {
            newTab.close();
            showStatus('Error generating preview', 'error');
        }
    };

    // Handle Download
    const handleDownload = async (id, invoices, directData = null) => {
        const inv = directData || invoices.find(i => i.id == id);
        if (!inv) return;

        try {
            showStatus('Preparing download...', 'success');
            const canvas = await generateInvoiceCanvas(inv);
            const link = document.createElement('a');
            link.download = `Invoice_${inv.id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            showStatus('Error downloading invoice', 'error');
        }
    };

    // Handle Share
    const handleShare = async (id, invoices, directData = null) => {
        const inv = directData || invoices.find(i => i.id == id);
        if (!inv) return;

        const shareData = {
            title: `Invoice #${inv.id}`,
            text: `Invoice for ${inv.customer_name}\nItem: ${inv.item_name}\nTotal: $${parseFloat(inv.total).toFixed(2)}\nDate: ${new Date(inv.created_at).toLocaleDateString()}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(shareData.text);
                showStatus('Details copied to clipboard!', 'success');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showStatus('Error sharing invoice', 'error');
            }
        }
    };

    // Handle Edit (Pre-fill form)
    const handleEdit = (id, invoices) => {
        const inv = invoices.find(i => i.id == id);
        if (!inv) return;

        editingId = id;
        document.getElementById('customerName').value = inv.customer_name;
        document.getElementById('itemName').value = inv.item_name;
        priceInput.value = inv.price;
        quantityInput.value = inv.quantity;
        
        updateTotal();
        saveBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            UPDATE INVOICE
        `;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle Delete
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this invoice?')) return;

        try {
            const response = await fetch('api.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                showStatus('Invoice deleted!', 'success');
                fetchInvoices();
            }
        } catch (error) {
            showStatus('Error deleting invoice', 'error');
        }
    };

    // Update Total Display
    const updateTotal = () => {
        const price = parseFloat(priceInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 0;
        const total = price * quantity;
        totalDisplay.textContent = `$${total.toFixed(2)}`;
    };

    // Show Status Message
    const showStatus = (message, type) => {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    };

    // Event Listeners
    priceInput.addEventListener('input', updateTotal);
    quantityInput.addEventListener('input', updateTotal);

    // Form Action Buttons
    const getFormData = () => {
        return {
            id: editingId || 'NEW',
            customer_name: document.getElementById('customerName').value || 'Customer Name',
            item_name: document.getElementById('itemName').value || 'Item Name',
            price: parseFloat(priceInput.value) || 0,
            quantity: parseInt(quantityInput.value) || 0,
            total: (parseFloat(priceInput.value) || 0) * (parseInt(quantityInput.value) || 0),
            created_at: new Date().toISOString()
        };
    };

    formPreviewBtn.addEventListener('click', () => handlePreview(null, null, getFormData()));
    formDownloadBtn.addEventListener('click', () => handleDownload(null, null, getFormData()));
    formShareBtn.addEventListener('click', () => handleShare(null, null, getFormData()));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            customer_name: document.getElementById('customerName').value,
            item_name: document.getElementById('itemName').value,
            price: parseFloat(priceInput.value),
            quantity: parseInt(quantityInput.value)
        };

        const action = editingId ? 'update' : 'create';
        if (editingId) data.id = editingId;

        try {
            const response = await fetch(`api.php?action=${action}`, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 401) {
                window.location.href = 'auth.html';
                return;
            }

            if (!response.ok) {
                let errorMsg = 'Server Error ' + response.status;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.details || errorMsg;
                } catch (e) {
                    const rawText = await response.text();
                    if (rawText) errorMsg = rawText.substring(0, 200);
                }
                throw new Error(errorMsg);
            }

            let result;
            const responseText = await response.text();
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('JSON Parse Error. Raw response:', responseText);
                throw new Error("Server returned invalid data. Raw response: " + responseText.substring(0, 300));
            }

            if (result.success) {
                showStatus(editingId ? 'Invoice updated!' : 'Invoice saved!', 'success');
                form.reset();
                editingId = null;
                saveBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    SAVE INVOICE
                `;
                updateTotal();
                fetchInvoices();
            } else {
                showStatus('Error: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            showStatus('Connection Error: ' + error.message + ' (Try Ctrl+F5 to clear cache)', 'error');
        }
    });

    // Initial Load
    fetchUserInfo();
    fetchInvoices();
});
