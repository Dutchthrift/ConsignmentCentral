/**
 * Types for the Dutch Thrift consignment platform
 */

/**
 * User types
 */
export enum UserTypes {
  ADMIN = "admin",
  CONSIGNOR = "consignor"
}

/**
 * Order status types
 */
export enum OrderStatus {
  AWAITING_SHIPMENT = "Awaiting Shipment",
  RECEIVED = "Received",
  PROCESSING = "Processing",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

/**
 * Item status types
 */
export enum ItemStatus {
  INTAKE_PROCESSING = "Intake Processing",
  PENDING_APPROVAL = "Pending Approval",
  APPROVED = "Approved",
  LISTED = "Listed",
  SOLD = "Sold",
  RETURNED = "Returned",
  REJECTED = "Rejected"
}