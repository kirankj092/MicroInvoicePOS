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

    let editingId = null;

    // Fetch Invoices (Read)
    const fetchInvoices = async () => {
        try {
            const response = await fetch('api.php?action=read');
            const invoices = await response.json();
            renderInvoices(invoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        }
    };

    // Render Invoices
    const renderInvoices = (invoices) => {
        invoiceList.innerHTML = '';
        
        if (!invoices || invoices.length === 0) {
            emptyState.style.display = 'block';
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
                    <button class="btn-icon edit-btn" data-id="${inv.id}" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button class="btn-icon delete-btn" data-id="${inv.id}" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
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

            const result = await response.json();

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
            showStatus('Network error. Check your server connection.', 'error');
        }
    });

    // Initial Load
    fetchInvoices();
});
