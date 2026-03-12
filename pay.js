// pay.js - Paystack API Integration
const paystack = (function() {
    const SECRET_KEY = 'sk_test_5c3e54a3d6b337aee6c5ff8a274ff7236bdc8403'; // Replace with your actual secret key
    const BASE_URL = 'https://api.paystack.co';
    
    return {
        // Fetch transactions from Paystack
        async fetchTransactions(options = {}) {
            try {
                const { perPage = 50, page = 1, status = 'success' } = options;
                
                const response = await fetch(`${BASE_URL}/transaction?perPage=${perPage}&page=${page}&status=${status}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.status) {
                    throw new Error(data.message || 'Failed to fetch transactions');
                }
                
                // Format transactions
                return data.data.map(tx => ({
                    reference: tx.reference,
                    amount: tx.amount,
                    status: tx.status,
                    customer: {
                        email: tx.customer?.email,
                        code: tx.customer?.customer_code
                    },
                    paidAt: tx.paid_at,
                    createdAt: tx.created_at,
                    channel: tx.channel,
                    currency: tx.currency
                }));
                
            } catch (error) {
                console.error('Paystack fetch error:', error);
                throw error;
            }
        },
        
        // Verify a single transaction
        async verifyTransaction(reference) {
            try {
                if (!reference) {
                    throw new Error('Transaction reference required');
                }
                
                const response = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.status) {
                    return {
                        status: false,
                        message: data.message || 'Verification failed',
                        data: null
                    };
                }
                
                const tx = data.data;
                return {
                    status: true,
                    message: 'Verification successful',
                    data: {
                        reference: tx.reference,
                        amount: tx.amount,
                        status: tx.status,
                        customer: {
                            email: tx.customer?.email,
                            code: tx.customer?.customer_code
                        },
                        paidAt: tx.paid_at,
                        channel: tx.channel,
                        currency: tx.currency
                    }
                };
                
            } catch (error) {
                console.error('Verification error:', error);
                return {
                    status: false,
                    message: error.message,
                    data: null
                };
            }
        },
        
        // Get transactions by email
        async getTransactionsByEmail(email, options = {}) {
            try {
                const transactions = await this.fetchTransactions(options);
                return transactions.filter(tx => 
                    tx.customer?.email?.toLowerCase() === email.toLowerCase()
                );
            } catch (error) {
                console.error('Error filtering by email:', error);
                throw error;
            }
        },
        
        // Format amount (kobo to naira)
        formatAmount(kobo) {
            return (kobo / 100).toFixed(2);
        },
        
        // Validate transaction
        validateTransaction(tx) {
            if (!tx) return { valid: false, reason: 'No transaction data' };
            if (!tx.reference) return { valid: false, reason: 'Missing reference' };
            if (!tx.amount) return { valid: false, reason: 'Missing amount' };
            if (!tx.customer?.email) return { valid: false, reason: 'Missing customer email' };
            if (tx.status !== 'success') return { valid: false, reason: 'Transaction not successful' };
            return { valid: true };
        }
    };
})();

// Make paystack available globally
window.paystack = paystack;
