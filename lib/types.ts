import type { ObjectId } from "mongodb";

/** One bookable slot: a date plus a time range. */
export type Slot = {
  id: string;
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
};

export interface EventDoc {
  _id?: ObjectId;
  name: string;
  note?: string;
  slots: Slot[];
  createdAt: Date;
}

/** A share link — one per group (e.g. an SLT) so responses stay segregated. */
export interface LinkDoc {
  _id?: ObjectId;
  eventId: ObjectId;
  label: string;
  token: string;
  createdAt: Date;
}

export interface ResponseDoc {
  _id?: ObjectId;
  eventId: ObjectId;
  linkId: ObjectId;
  name: string;
  slotIds: string[];
  createdAt: Date;
}

/* ---- serialized shapes sent to client components ---- */

export type EventSummary = {
  id: string;
  name: string;
  dateCount: number;
  slotCount: number;
  linkCount: number;
  responseCount: number;
  createdAt: string;
};

export type LinkInfo = {
  id: string;
  label: string;
  token: string;
  responseCount: number;
};

export type ResponseInfo = {
  id: string;
  name: string;
  linkId: string;
  linkLabel: string;
  slotIds: string[];
  createdAt: string;
};

export type EventDetail = {
  id: string;
  name: string;
  note?: string;
  slots: Slot[];
  links: LinkInfo[];
  responses: ResponseInfo[];
  createdAt: string;
};

export type PublicEvent = {
  name: string;
  note?: string;
  linkLabel: string;
  slots: Slot[];
  /** slotId -> name of whoever booked it first; a booked slot is locked for everyone else. */
  taken: Record<string, string>;
};
