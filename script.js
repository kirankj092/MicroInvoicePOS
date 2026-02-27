/**
 * script.js - Vanilla JavaScript for Micro Invoice POS
 * Uses LocalStorage for persistence in this standalone version.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('invoiceForm');
    const priceInput = document.getElementById('price');
    const quantityInput = document.getElementById('quantity');
    const totalDisplay = document.getElementById('totalDisplay');
    const invoiceList = document.getElementById('invoiceList');
    const emptyState = document.getElementById('emptyState');
    const statusMessage = document.getElementById('statusMessage');

    // Load invoices from LocalStorage
    let invoices = JSON.parse(localStorage.getItem('pos_invoices')) || [];

    // Render Invoices
    const renderInvoices = () => {
        invoiceList.innerHTML = '';
        
        if (invoices.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        // Sort by date descending
        const sortedInvoices = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedInvoices.forEach(inv => {
            const row = document.createElement('tr');
            const date = new Date(inv.date).toLocaleDateString();
            
            row.innerHTML = `
                <td style="font-family: monospace; color: #64748b;">${date}</td>
                <td style="font-weight: 500;">${inv.customerName}</td>
                <td>${inv.itemName} <span style="color: #94a3b8; font-size: 0.75rem;">x${inv.quantity}</span></td>
                <td class="text-right text-bold" style="color: #1e4e8c;">$${parseFloat(inv.total).toFixed(2)}</td>
            `;
            invoiceList.appendChild(row);
        });
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
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    };

    // Event Listeners
    priceInput.addEventListener('input', updateTotal);
    quantityInput.addEventListener('input', updateTotal);

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const newInvoice = {
            id: Date.now(),
            customerName: document.getElementById('customerName').value,
            itemName: document.getElementById('itemName').value,
            price: parseFloat(priceInput.value),
            quantity: parseInt(quantityInput.value),
            total: parseFloat(priceInput.value) * parseInt(quantityInput.value),
            date: new Date().toISOString()
        };

        // Save to LocalStorage
        invoices.push(newInvoice);
        localStorage.setItem('pos_invoices', JSON.stringify(invoices));

        // Update UI
        renderInvoices();
        form.reset();
        updateTotal();
        showStatus('Invoice saved successfully!', 'success');
    });

    // Initial Render
    renderInvoices();
});

/**
 * NOTE FOR SERVER HOSTING:
 * If you want to save to a real MySQL database, you would replace the 
 * LocalStorage logic in the form submit handler with a fetch() call:
 * 
 * fetch('save_invoice.php', {
 *     method: 'POST',
 *     body: JSON.stringify(newInvoice),
 *     headers: { 'Content-Type': 'application/json' }
 * })
 * .then(res => res.json())
 * .then(data => { ... handle success ... });
 */
