#!/usr/bin/env node
/**
 * Dev-only: render the "Order Confirmed" email HTML with mock data (no send).
 * Usage: node scripts/render-order-confirmed-email.js
 * Output: scripts/order-confirmed-preview.html
 */
const path = require('path');
const fs = require('fs');

const mockOrder = {
    id: 'order_mock_123',
    orderNumber: 'SS-20260216-ABC12',
    name: 'Maria Silva',
    email: 'maria@example.com',
    total: 109.5,
    currency: 'eur',
    cart: [
        { name: 'Sardinia', size: 'M', quantity: 1, price: 70 },
        { name: 'Isole Cayman', size: 'L', quantity: 2, price: 70 }
    ],
    shippingAddress: {
        street: 'Rua das Flores 42',
        apartment: 'Apto 1',
        city: 'Lisboa',
        postalCode: '1200-195',
        country: 'PT',
        countryName: 'Portugal'
    }
};

try {
    const email = require('../lib/email');
    const { html, subject, text } = email.buildOrderConfirmedEmail(mockOrder);
    const outPath = path.join(__dirname, 'order-confirmed-preview.html');
    fs.writeFileSync(outPath, html.trim(), 'utf8');
    console.log('Preview written to:', outPath);
    console.log('Subject:', subject);
    console.log('--- Text (first 300 chars) ---');
    console.log(text.substring(0, 300) + '...');
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
