const Return = require("../../models/returnSchema");
const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Notification = require("../../models/notificationSchema");
const { Transaction } = require("mongodb");


const getReturnApprovals = async (req, res) => {
    try {
        const returnData = await Return.find().populate('orderId userId'); 
        res.render('returnapprovals', {
            returns: returnData,
        });
    } catch (error) {
        console.error('Error fetching return approvals:', error);
        res.status(500).send('Server error');
    }
};

const returnUpdate = async (req, res) => {
    try {
        const returnId = req.query.id;
        const { status } = req.body;

        const returnData = await Return.findById(returnId);
        if (!returnData) {
            return res.status(404).json({ message: "Return request not found" });
        }

        const userId = returnData.userId;
        const orderId = returnData.orderId;
        const amount = returnData.refundAmount;

        if (status === "approved") {
            try {
                // Fetch or create the wallet for the user
                let wallet = await Wallet.findOne({ userId });
                
                if (!wallet) {
                    wallet = new Wallet({
                        userId,
                        balance: 0,
                        transactions: []
                    });
                    await wallet.save();
                }
       
                // Update the wallet's balance and add the transaction
                const updatedWallet = await Wallet.findOneAndUpdate(
                    { userId },
                    { 
                        $inc: { balance: amount },
                        $push: {
                            transactions: {
                                type: 'credit',
                                amount: amount,
                                description: "Refund for your returned product",
                                orderId,
                                date: new Date()
                            }
                        }
                    },
                    { new: true } // Return the updated document
                );

                // Update the user's wallet balance in their document
                await User.findOneAndUpdate(
                    { _id: userId },
                    { $set: { wallet: updatedWallet.balance } } // Sync wallet balance
                );

                // Update return status
                returnData.returnStatus = status;
                await returnData.save();

                // Add or update notifications
                let notification = await Notification.findOne({ userId });

                if (!notification) {
                    notification = new Notification({
                        userId,
                        message: "Your Return Request Has Been Approved, Amount Is Added To Your Wallet",
                        status: "unread",
                    });
                    await notification.save();
                } else {
                    await Notification.findOneAndUpdate(
                        { userId },
                        {
                            message: "Your Return Request Has Been Approved, Amount Is Added To Your Wallet",
                            status: "unread",
                            createdAt: Date.now()
                        }
                    );
                }

                // Update the order status
                await Order.findOneAndUpdate(
                    { _id: orderId },
                    { $set: { status: "Return Approved", paymentStatus: "Refunded" } }
                );

            } catch (error) {
                console.error("Error in updating wallet and return status:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        } 
        if (status === "rejected") {
            try {
                returnData.returnStatus = status;
                await returnData.save();
        
                await Notification.findOneAndUpdate(
                    { userId },
                    {
                        message: "Your Return Request Is Rejected",
                        status: "unread",
                        createdAt: Date.now()
                    },
                    { upsert: true }
                );
        
                await Order.findOneAndUpdate(
                    { _id: orderId },
                    { $set: { status: "Return Rejected" } }
                );
            } catch (error) {
                console.error("Error in rejecting return status:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        }
        
        return res.redirect(`/admin/return-approvals`);
        
    } catch (error) {
        console.error("Error in Updating Return Status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports={
    getReturnApprovals,
    returnUpdate
}