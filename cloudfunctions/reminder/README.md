# reminder

Phase 6 reminder settings and subscription-message dispatch.

Configure the cloud function environment variable `REMINDER_TEMPLATE_CONFIG` before enabling reminders. The value is a JSON object keyed by reminder type:

```json
{
  "breakfast": {
    "template_id": "YOUR_TEMPLATE_ID",
    "page": "pages/home/index",
    "long_term": false,
    "data": {
      "thing1": "早餐记录提醒",
      "time2": "{{time}}"
    }
  }
}
```

Supported keys: `breakfast`, `lunch`, `dinner`, `water`, `exercise`, `weight`. Data field names must match the selected WeChat subscription-message template. Upload the timer trigger after deploying the function.
