// pay.js - Paystack API Integration

const paystack = (function () {

    const SECRET_KEY = "sk_test_5c3e54a3d6b337aee6c5ff8a274ff7236bdc8403";
    const BASE_URL = "https://api.paystack.co";

    async function apiRequest(endpoint) {

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${SECRET_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            throw new Error(`Paystack API error: ${res.status}`);
        }

        const data = await res.json();

        if (!data.status) {
            throw new Error(data.message || "Paystack request failed");
        }

        return data;

    }

    return {

        // Fetch transactions
        async fetchTransactions(options = {}) {

            const {
                perPage = 50,
                page = 1,
                status = "success",
                after = null
            } = options;

            const data = await apiRequest(
                `/transaction?perPage=${perPage}&page=${page}&status=${status}`
            );

            let transactions = data.data.map(tx => ({
                reference: tx.reference,
                amount: tx.amount,
                status: tx.status,
                email: tx.customer?.email || null,
                customerCode: tx.customer?.customer_code || null,
                paidAt: tx.paid_at,
                createdAt: tx.created_at,
                channel: tx.channel,
                currency: tx.currency
            }));

            // Filter only new transactions
            if (after) {
                const afterTime = new Date(after).getTime();

                transactions = transactions.filter(tx => {
                    if (!tx.paidAt) return false;
                    return new Date(tx.paidAt).getTime() > afterTime;
                });
            }

            return transactions;

        },

        // Verify transaction
        async verifyTransaction(reference) {

            if (!reference) {
                throw new Error("Transaction reference required");
            }

            const data = await apiRequest(
                `/transaction/verify/${encodeURIComponent(reference)}`
            );

            const tx = data.data;

            return {
                reference: tx.reference,
                amount: tx.amount,
                status: tx.status,
                email: tx.customer?.email || null,
                paidAt: tx.paid_at,
                channel: tx.channel,
                currency: tx.currency
            };

        },

        // Filter transactions by email
        async getTransactionsByEmail(email, options = {}) {

            if (!email) {
                throw new Error("Email required");
            }

            const transactions = await this.fetchTransactions(options);

            const target = email.toLowerCase().trim();

            return transactions.filter(tx =>
                tx.email && tx.email.toLowerCase().trim() === target
            );

        },

        // Format amount
        formatAmount(kobo) {
            return Number(kobo) / 100;
        },

        // Validate transaction
        validateTransaction(tx) {

            if (!tx) return { valid: false, reason: "Missing transaction data" };

            if (!tx.reference)
                return { valid: false, reason: "Missing reference" };

            if (!tx.amount)
                return { valid: false, reason: "Missing amount" };

            if (!tx.email)
                return { valid: false, reason: "Missing customer email" };

            if (tx.status !== "success")
                return { valid: false, reason: "Transaction not successful" };

            return { valid: true };

        }

    };

})();

// expose globally
window.paystack = paystack;
