import express from "express";
import bodyParser from "body-parser";
import stripe from "stripe";
import User from "../models/userModel.js";

const stripeWebhook = express();
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY); 

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Stripe secret key is not set in environment variables.");
  process.exit(1); 
}

stripeWebhook.use(bodyParser.raw({ type: "application/json" }));

stripeWebhook.post("/webhook", async (req, res) => {
  const endpointSecret = "whsec_4bd7bba25eeaaf04aef34956d655a3b4e75e4424dfdbb9fc3004a9cd7fdde42e";
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    
    event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
     
      if (!session.metadata || !session.metadata.userId) {
        throw new Error("Missing userId in session metadata.");
      }

      const userId = session.metadata.userId;

     
      await User.findByIdAndUpdate(userId, { subscribed: true });
      console.log(`User ${userId} subscription status updated to true.`);
    } catch (error) {
      console.error("Error processing subscription update:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send("Webhook received and processed.");
});

export default stripeWebhook;
