/**
 * script.js - Vanilla JavaScript for Micro Invoice POS
 * Interacts with api.php for full CRUD operations.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Micro Invoice POS Initializing...");
    const form = document.getElementById('invoiceForm');
    const itemsContainer = document.getElementById('itemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');
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
            
            const itemsSummary = inv.items && inv.items.length > 0 
                ? (inv.items.length === 1 ? inv.items[0].item_name : `${inv.items[0].item_name} (+${inv.items.length - 1} more)`)
                : 'No items';

            row.innerHTML = `
                <td style="font-family: monospace; color: #64748b;">${date}</td>
                <td style="font-weight: 500;">${inv.customer_name}</td>
                <td>${itemsSummary}</td>
                <td class="text-right text-bold" style="color: #1e4e8c;">₹${parseFloat(inv.total).toFixed(2)}</td>
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
        
        const itemsBody = document.getElementById('tpl-items-body');
        itemsBody.innerHTML = '';
        
        if (invoice.items) {
            invoice.items.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #f1f5f9';
                tr.innerHTML = `
                    <td style="padding: 15px 12px; font-size: 14px;">${item.item_name}</td>
                    <td style="padding: 15px 12px; text-align: center; font-size: 14px;">${item.quantity}</td>
                    <td style="padding: 15px 12px; text-align: right; font-size: 14px;">₹${parseFloat(item.price).toFixed(2)}</td>
                    <td style="padding: 15px 12px; text-align: right; font-size: 14px;">₹${parseFloat(item.discount || 0).toFixed(2)}</td>
                    <td style="padding: 15px 12px; text-align: right; font-size: 14px;">${item.gst_rate}%</td>
                    <td style="padding: 15px 12px; text-align: right; font-size: 14px; font-weight: 600;">₹${parseFloat(item.subtotal).toFixed(2)}</td>
                `;
                itemsBody.appendChild(tr);
            });
        }

        document.getElementById('tpl-grand-total').textContent = `₹${parseFloat(invoice.total).toFixed(2)}`;

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

        const itemsText = inv.items ? inv.items.map(i => `${i.item_name} (x${i.quantity})`).join(', ') : 'No items';
        const shareData = {
            title: `Invoice #${inv.id}`,
            text: `Invoice for ${inv.customer_name}\nItems: ${itemsText}\nTotal: $${parseFloat(inv.total).toFixed(2)}\nDate: ${new Date(inv.created_at).toLocaleDateString()}`,
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
        
        // Clear and refill items
        itemsContainer.innerHTML = '';
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(item => addItemRow(item));
        } else {
            addItemRow();
        }
        
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

    // Add Item Row
    const addItemRow = (data = null) => {
        if (!itemsContainer) {
            console.error("itemsContainer not found!");
            return;
        }

        // Collapse all existing rows
        document.querySelectorAll('.item-row').forEach(r => r.classList.add('collapsed'));

        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="row-header">
                <div class="row-title">
                    <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    <span>ITEM #${itemsContainer.children.length + 1}</span>
                    <span class="item-summary-text" style="font-weight: 400; color: #64748b; margin-left: 10px;"></span>
                </div>
                <div class="row-actions">
                    <button type="button" class="btn-remove-item" title="Remove Item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="row-content">
                <div class="input-group" style="margin-bottom: 0.75rem;">
                    <input type="text" class="item-name" required placeholder="Item Name" value="${data ? data.item_name : ''}">
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label style="font-size: 0.65rem; margin-bottom: 2px;">Price</label>
                        <input type="number" class="item-price" step="0.01" required placeholder="Price" value="${data ? data.price : ''}">
                    </div>
                    <div class="input-group">
                        <label style="font-size: 0.65rem; margin-bottom: 2px;">Qty</label>
                        <input type="number" class="item-qty" required placeholder="Qty" value="${data ? data.quantity : '1'}">
                    </div>
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label style="font-size: 0.65rem; margin-bottom: 2px;">Discount (₹)</label>
                        <input type="number" class="item-discount" step="0.01" placeholder="Discount" value="${data ? (data.discount || 0) : '0'}">
                    </div>
                    <div class="input-group">
                        <label style="font-size: 0.65rem; margin-bottom: 2px;">GST (%)</label>
                        <select class="item-gst">
                            <option value="0" ${data && data.gst_rate == 0 ? 'selected' : ''}>0%</option>
                            <option value="5" ${data && data.gst_rate == 5 ? 'selected' : ''}>5%</option>
                            <option value="12" ${data && data.gst_rate == 12 ? 'selected' : ''}>12%</option>
                            <option value="18" ${data && data.gst_rate == 18 ? 'selected' : ''}>18%</option>
                            <option value="28" ${data && data.gst_rate == 28 ? 'selected' : ''}>28%</option>
                        </select>
                    </div>
                </div>
                <div class="subtotal-display">₹0.00</div>
            </div>
        `;

        const header = row.querySelector('.row-header');
        header.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-item')) return;
            const isCollapsed = row.classList.contains('collapsed');
            if (isCollapsed) {
                document.querySelectorAll('.item-row').forEach(r => r.classList.add('collapsed'));
                row.classList.remove('collapsed');
            } else {
                row.classList.add('collapsed');
            }
        });

        const removeBtn = row.querySelector('.btn-remove-item');
        removeBtn.addEventListener('click', () => {
            if (itemsContainer.children.length > 1) {
                row.remove();
                updateTotal();
                // Update numbering
                document.querySelectorAll('.item-row').forEach((r, idx) => {
                    r.querySelector('.row-title span').textContent = `ITEM #${idx + 1}`;
                });
            } else {
                showStatus('Invoice must have at least one item.', 'error');
            }
        });

        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateRowSubtotal(row);
                updateTotal();
            });
        });

        itemsContainer.appendChild(row);
        updateRowSubtotal(row);
        updateTotal();
    };

    const updateRowSubtotal = (row) => {
        const name = row.querySelector('.item-name').value;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        const discount = parseFloat(row.querySelector('.item-discount').value) || 0;
        const gstRate = parseInt(row.querySelector('.item-gst').value) || 0;

        // Subtotal = (Price * Qty - Discount) * (1 + GST/100)
        const baseAmount = (price * qty) - discount;
        const gstAmount = baseAmount * (gstRate / 100);
        const subtotal = baseAmount + gstAmount;

        row.querySelector('.subtotal-display').textContent = `₹${subtotal.toFixed(2)}`;
        row.querySelector('.item-summary-text').textContent = name ? `- ${name}` : '';
        
        return subtotal;
    };

    // Update Total Display
    const updateTotal = () => {
        let grandTotal = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            grandTotal += updateRowSubtotal(row);
        });
        totalDisplay.textContent = `₹${grandTotal.toFixed(2)}`;
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
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => addItemRow());
    } else {
        console.error("addItemBtn not found!");
    }

    // Form Action Buttons
    const getFormData = () => {
        const items = [];
        let grandTotal = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const qty = parseInt(row.querySelector('.item-qty').value) || 0;
            const discount = parseFloat(row.querySelector('.item-discount').value) || 0;
            const gstRate = parseInt(row.querySelector('.item-gst').value) || 0;
            
            const baseAmount = (price * qty) - discount;
            const gstAmount = baseAmount * (gstRate / 100);
            const subtotal = baseAmount + gstAmount;

            items.push({
                item_name: row.querySelector('.item-name').value || 'Item Name',
                price: price,
                quantity: qty,
                discount: discount,
                gst_rate: gstRate,
                subtotal: subtotal
            });
            grandTotal += subtotal;
        });

        return {
            id: editingId || 'NEW',
            customer_name: document.getElementById('customerName').value || 'Customer Name',
            items: items,
            total: grandTotal,
            created_at: new Date().toISOString()
        };
    };

    formPreviewBtn.addEventListener('click', () => handlePreview(null, null, getFormData()));
    formDownloadBtn.addEventListener('click', () => handleDownload(null, null, getFormData()));
    formShareBtn.addEventListener('click', () => handleShare(null, null, getFormData()));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = getFormData();
        const data = {
            customer_name: formData.customer_name,
            items: formData.items,
            total: formData.total
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
                itemsContainer.innerHTML = '';
                addItemRow();
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
    addItemRow();
});
