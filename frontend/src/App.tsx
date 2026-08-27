import { useState } from "react";
import "./App.css";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function App() {
  const [status, setStatus] = useState("");

  const handlePayment = async () => {
    try {
      setStatus("Creating order...");

      const response = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 50000,
          currency: "INR",
        }),
      });

      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || "Failed to create order");
      }

      setStatus("Opening Razorpay...");

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Revenue Recovery Agent",
        description: "Test Payment",
        order_id: order.id,

        handler: function (response: any) {
          console.log("Payment successful:", response);

          setStatus(
            `Payment successful: ${response.razorpay_payment_id}`
          );
        },

        modal: {
          ondismiss: function () {
            setStatus("Payment window closed.");
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      console.error(error);
      setStatus("Something went wrong.");
    }
  };

  return (
    <div className="app">
      <h1>Revenue Recovery Agent</h1>

      <p>Razorpay Test Payment</p>

      <button onClick={handlePayment}>
        Pay ₹500
      </button>

      {status && <p>{status}</p>}
    </div>
  );
}

export default App;