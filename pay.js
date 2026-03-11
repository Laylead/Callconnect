// pay.js - Fixed version with proper error handling
const paystack = {
    secretKey: 'sk_test_5c3e54a3d6b337aee6c5ff8a274ff7236bdc8403', // REPLACE WITH YOUR ACTUAL SECRET KEY
    
    // Headers for Paystack API
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
        };
    },

    // Fetch transactions with better error handling
    async fetchTransactions(options = {}) {
        try {
            console.log('Fetching Paystack transactions...');
            
            // Build query parameters
            const params = new URLSearchParams({
                perPage: options.perPage || 50,
                page: options.page || 1,
                status: options.status || 'success'
            });
            
            if (options.from) params.append('from', options.from);
            if (options.to) params.append('to', options.to);

            // Option 1: Direct API call (if CORS is enabled)
            const response = await fetch(`https://api.paystack.co/transaction?${params}`, {
                method: 'GET',
                headers: this.getHeaders(),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.status) {
                throw new Error(data.message || 'Failed to fetch transactions');
            }

            console.log(`Fetched ${data.data.length} transactions`);
            return this.normalizeTransactions(data.data);

        } catch (error) {
            console.error('Paystack fetch error:', error);
            
            // Option 2: Fallback to proxy if CORS fails
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.log('Trying proxy fallback...');
                return this.fetchViaProxy(options);
            }
            
            throw error;
        }
    },

    // Fallback: Use a proxy endpoint (you need to create this on your server)
    async fetchViaProxy(options) {
        try {
            // You need to create this endpoint on your server
            const response = await fetch('/api/paystack/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });
            
            if (!response.ok) {
                throw new Error('Proxy fetch failed');
            }
            
            const data = await response.json();
            return data.transactions || [];
        } catch (error) {
            console.error('Proxy fetch error:', error);
            return []; // Return empty array as fallback
        }
    },

    // Verify transaction with better error handling
    async verifyTransaction(reference) {
        try {
            console.log(`Verifying transaction: ${reference}`);
            
            if (!reference) {
                return {
                    status: false,
                    message: 'No reference provided',
                    data: null
                };
            }

            // Option 1: Direct API call
            const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
                method: 'GET',
                headers: this.getHeaders(),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (!data.status) {
                return {
                    status: false,
                    message: data.message || 'Verification failed',
                    data: null
                };
            }

            console.log('Verification successful');
            return {
                status: true,
                message: 'Verified',
                data: this.normalizeTransaction(data.data)
            };

        } catch (error) {
            console.error('Verify error:', error);
            
            // Option 2: Try proxy
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                try {
                    const proxyResponse = await fetch('/api/paystack/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reference })
                    });
                    
                    if (proxyResponse.ok) {
                        const proxyData = await proxyResponse.json();
                        return proxyData;
                    }
                } catch (proxyError) {
                    console.error('Proxy verify error:', proxyError);
                }
            }
            
            return {
                status: false,
                message: error.message,
                data: null
            };
        }
    },

    // Normalize transaction data
    normalizeTransaction(tx) {
        return {
            reference: tx.reference,
            amount: tx.amount,
            status: tx.status,
            customer: {
                email: tx.customer?.email || 'unknown@example.com',
                code: tx.customer?.customer_code
            },
            paidAt: tx.paid_at || tx.created_at,
            channel: tx.channel,
            currency: tx.currency
        };
    },

    normalizeTransactions(transactions) {
        return transactions.map(tx => this.normalizeTransaction(tx));
    },

    // Test the connection
    async testConnection() {
        try {
            const response = await fetch('https://api.paystack.co/balance', {
                headers: this.getHeaders()
            });
            const data = await response.json();
            return data.status;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.paystack = paystack;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = paystack;
}
