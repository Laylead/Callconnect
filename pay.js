// pay.js
// Professional Paystack integration for creator dashboard
// Handles webhooks, transaction verification, and real-time events

class PaystackAPI {
    constructor() {
        this.secretKey = 'sk_test_5c3e54a3d6b337aee6c5ff8a274ff7236bdc8403'; // Replace with your actual secret key
        this.webhookListeners = [];
        this.baseURL = 'https://api.paystack.co';
        
        // Initialize webhook listener if running in browser with EventSource support
        this.initWebhookListener();
    }

    /**
     * Initialize server-sent events for real-time transactions
     * Note: This requires a backend endpoint that streams Paystack webhooks
     */
    initWebhookListener() {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || !window.EventSource) return;

        // In production, you'd connect to your own SSE endpoint that receives Paystack webhooks
        // This is a placeholder - you need to implement a backend endpoint
        const eventSource = new EventSource('/api/paystack/stream');
        
        eventSource.onmessage = (event) => {
            try {
                const transaction = JSON.parse(event.data);
                this.notifyListeners(transaction);
            } catch (error) {
                console.error('Error parsing webhook data:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.initWebhookListener(), 5000);
        };
    }

    /**
     * Register a callback for incoming transactions
     */
    onTransaction(callback) {
        if (typeof callback === 'function') {
            this.webhookListeners.push(callback);
        }
    }

    /**
     * Notify all listeners of new transaction
     */
    notifyListeners(transaction) {
        this.webhookListeners.forEach(listener => {
            try {
                listener(transaction);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * Fetch transactions from Paystack with pagination
     */
    async fetchTransactions(options = {}) {
        const {
            perPage = 50,
            page = 1,
            from = null,
            to = null,
            status = 'success'
        } = options;

        try {
            let url = `${this.baseURL}/transaction?perPage=${perPage}&page=${page}`;
            
            if (from) url += `&from=${from}`;
            if (to) url += `&to=${to}`;
            if (status) url += `&status=${status}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.status) {
                throw new Error(data.message || 'Failed to fetch transactions');
            }

            return this.normalizeTransactions(data.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    }

    /**
     * Fetch a specific transaction by ID
     */
    async fetchTransaction(id) {
        try {
            const response = await fetch(`${this.baseURL}/transaction/${id}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.status) {
                throw new Error(data.message || 'Failed to fetch transaction');
            }

            return this.normalizeTransaction(data.data);
        } catch (error) {
            console.error('Error fetching transaction:', error);
            throw error;
        }
    }

    /**
     * Verify transaction by reference
     */
    async verifyTransaction(reference) {
        try {
            if (!reference) {
                throw new Error('Transaction reference is required');
            }

            const response = await fetch(`${this.baseURL}/transaction/verify/${encodeURIComponent(reference)}`, {
                method: 'GET',
                headers: this.getHeaders()
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

            return {
                status: true,
                message: 'Verification successful',
                data: this.normalizeTransaction(data.data)
            };
        } catch (error) {
            console.error('Error verifying transaction:', error);
            return {
                status: false,
                message: error.message,
                data: null
            };
        }
    }

    /**
     * Get transactions by email
     */
    async getTransactionsByEmail(email, options = {}) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }

            // First get all transactions (Paystack doesn't support email filtering directly)
            const transactions = await this.fetchTransactions(options);
            
            // Filter by email (case-insensitive)
            return transactions.filter(tx => 
                tx.customer?.email?.toLowerCase() === email.toLowerCase()
            );
        } catch (error) {
            console.error('Error fetching transactions by email:', error);
            throw error;
        }
    }

    /**
     * Get transaction timeline/events
     */
    async getTransactionTimeline(reference) {
        try {
            if (!reference) {
                throw new Error('Transaction reference is required');
            }

            const response = await fetch(`${this.baseURL}/transaction/timeline/${encodeURIComponent(reference)}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
                status: data.status,
                data: data.data || []
            };
        } catch (error) {
            console.error('Error fetching transaction timeline:', error);
            throw error;
        }
    }

    /**
     * Get transaction totals/stats
     */
    async getTransactionTotals(options = {}) {
        const { from = null, to = null } = options;

        try {
            let url = `${this.baseURL}/transaction/totals`;
            const params = new URLSearchParams();
            
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
                status: data.status,
                data: data.data || {}
            };
        } catch (error) {
            console.error('Error fetching transaction totals:', error);
            throw error;
        }
    }

    /**
     * Export transactions (for backup/reporting)
     */
    async exportTransactions(options = {}) {
        const { from = null, to = null, type = 'transaction' } = options;

        try {
            let url = `${this.baseURL}/transaction/export?type=${type}`;
            
            if (from) url += `&from=${from}`;
            if (to) url += `&to=${to}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
                status: data.status,
                data: data.data || {}
            };
        } catch (error) {
            console.error('Error exporting transactions:', error);
            throw error;
        }
    }

    /**
     * Get headers for API requests
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Normalize transaction data to consistent format
     */
    normalizeTransaction(tx) {
        return {
            reference: tx.reference,
            amount: tx.amount,
            status: tx.status,
            customer: {
                email: tx.customer?.email || null,
                code: tx.customer?.customer_code || null,
                firstName: tx.customer?.first_name || null,
                lastName: tx.customer?.last_name || null
            },
            paidAt: tx.paid_at,
            createdAt: tx.created_at,
            channel: tx.channel,
            currency: tx.currency,
            fees: tx.fees,
            metadata: tx.metadata || {},
            authorization: tx.authorization ? {
                last4: tx.authorization.last4,
                bin: tx.authorization.bin,
                expMonth: tx.authorization.exp_month,
                expYear: tx.authorization.exp_year,
                cardType: tx.authorization.card_type
            } : null
        };
    }

    /**
     * Normalize multiple transactions
     */
    normalizeTransactions(transactions) {
        return transactions.map(tx => this.normalizeTransaction(tx));
    }

    /**
     * Format amount from kobo to naira
     */
    formatAmount(koboAmount) {
        return (koboAmount / 100).toFixed(2);
    }

    /**
     * Parse amount from naira to kobo
     */
    parseAmount(nairaAmount) {
        return Math.round(parseFloat(nairaAmount) * 100);
    }

    /**
     * Validate transaction data
     */
    validateTransaction(transaction) {
        if (!transaction) {
            return { valid: false, reason: 'No transaction data' };
        }
        
        if (!transaction.reference) {
            return { valid: false, reason: 'Missing transaction reference' };
        }
        
        if (!transaction.amount || transaction.amount <= 0) {
            return { valid: false, reason: 'Invalid amount' };
        }
        
        if (!transaction.customer?.email) {
            return { valid: false, reason: 'Missing customer email' };
        }
        
        if (transaction.status !== 'success') {
            return { valid: false, reason: 'Transaction not successful' };
        }
        
        return { valid: true };
    }

    /**
     * Set up webhook endpoint (call this from your server)
     * This is for backend use - not called from frontend
     */
    handleWebhook(payload) {
        // Verify webhook signature (implement proper verification)
        // Then notify listeners
        this.notifyListeners(payload);
        
        return { received: true };
    }
}

// Create singleton instance
const paystack = new PaystackAPI();

// Export for browser
if (typeof window !== 'undefined') {
    window.paystack = paystack;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = paystack;
}
