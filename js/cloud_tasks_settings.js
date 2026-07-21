Cloud Run 環境変数

GOOGLE_CLOUD_PROJECT=<プロジェクトID>
TASK_LOCATION=asia-northeast1
DATA_RAW_TASK_QUEUE=data-raw
SERVICE_BASE_URL=https://<Cloud Run URL>
TASK_SERVICE_ACCOUNT=<Cloud Tasks用サービスアカウント>
TASK_AUDIENCE=https://<Cloud Run URL>
TASK_SERVICE_ACCOUNT_EMAILS=<Cloud Tasks用サービスアカウント>

Cloud Tasks キュー例

gcloud tasks queues create data-raw \
  --location=asia-northeast1 \
  --max-concurrent-dispatches=5 \
  --max-dispatches-per-second=5
