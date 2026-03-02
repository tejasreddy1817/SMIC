import mongoose from "mongoose";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export interface ICustomerServiceTicket extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  assignedTo?: mongoose.Types.ObjectId | null; // staff user id
  status: TicketStatus;
  messages: { from: string; body: string; createdAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerServiceTicketSchema = new mongoose.Schema<ICustomerServiceTicket>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["open", "pending", "resolved", "closed"], default: "open" },
    messages: {
      type: [{ from: { type: String }, body: { type: String }, createdAt: { type: Date } }],
      default: [],
    },
  },
  { timestamps: true }
);

CustomerServiceTicketSchema.index({ userId: 1 });

export const CustomerServiceTicket = mongoose.model<ICustomerServiceTicket>(
  "CustomerServiceTicket",
  CustomerServiceTicketSchema
);
