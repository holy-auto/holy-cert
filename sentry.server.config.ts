import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    debug: false,
    sendDefaultPii: false,

    beforeSend(event) {
      // Scrub potential PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.message) {
            bc.message = bc.message
              .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[EMAIL]")
              .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CARD]");
          }
          return bc;
        });
      }
      return event;
    },
  });
}
