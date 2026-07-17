# Cloud Functions Plan

Phase 0 keeps the cloud backend as a clear directory plan. Business logic will be added by later phase specs.

## Function domains

- `auth`: WeChat login and user identity bootstrap.
- `profile`: Health profile CRUD.
- `goal`: Fitness goal CRUD.
- `food`: Food categories, food search, custom foods.
- `diet`: Diet records and meal summaries.
- `exercise`: Exercise records.
- `body`: Body weight records.
- `stats`: Daily dashboard and 7-day trends.
- `checkin`: Daily check-in records.
- `feedback`: User feedback.
- `reminder`: User-authorized record reminders and timer dispatch.
- `recipe`: Public recipes, meal plan matching, diet record creation, and recipe administration.
- `admin`: Basic operation admin APIs.
- `_shared`: Shared helpers used by business cloud functions.
- `_quickstart`: Archived WeChat cloud development quickstart examples. Do not use as MVP business code.

## Response shape

Cloud functions should return one of these shapes:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "code": "VALIDATION_ERROR", "message": "参数错误" }
```

Client calls should go through `miniprogram/utils/cloud.js`, which normalizes this shape and shows failures with `miniprogram/utils/toast.js`.

## Security baseline

- Do not return `session_key` to the client.
- Do not store AppSecret or private keys in the miniprogram.
- Validate login state before write operations.
- Filter private user data by `user_id` or `openid`.
- Record operation time for delete and disable operations.
