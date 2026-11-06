# ECS Manual Recovery Procedure

## Purpose

Stop Fargate tasks if the GitHub Actions deployment workflow fails, is cancelled, or cannot complete cleanup.

## When to use

- A deployment workflow is interrupted.
- The cleanup step fails.
- ECS still has running or pending tasks after testing.

## Prerequisites

- AWS account restrictions have been lifted.
- An authorized AWS CLI session is available.
- AWS region is `eu-central-1`.
- ECS cluster is `pipewright-cluster`.
- ECS service is `pipewright-app`.

Do not reactivate disabled IAM users or create permanent access keys solely for cleanup. Use an approved temporary-credential method.

## Recovery commands

### 1. Verify AWS identity

```bash
aws sts get-caller-identity
```

Confirm that the returned identity belongs to the intended AWS account.

### 2. Scale the ECS service to zero

```bash
aws ecs update-service \
  --region eu-central-1 \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --desired-count 0
```

This requests that ECS stop running application tasks.

### 3. Wait for the service to settle

```bash
aws ecs wait services-stable \
  --region eu-central-1 \
  --cluster pipewright-cluster \
  --services pipewright-app
```

If the waiter fails, continue to inspect task counts rather than assuming cleanup succeeded.

### 4. Verify task counts

```bash
aws ecs describe-services \
  --region eu-central-1 \
  --cluster pipewright-cluster \
  --services pipewright-app \
  --query 'services[0].[desiredCount,runningCount,pendingCount]' \
  --output text
```

Expected output:

```text
0    0    0
```

### 5. Confirm no running tasks

```bash
aws ecs list-tasks \
  --region eu-central-1 \
  --cluster pipewright-cluster \
  --service-name pipewright-app \
  --desired-status RUNNING
```

Expected: an empty `taskArns` list.

## Important limitations

- Desired count zero does not immediately guarantee running tasks have stopped.
- Do not assume cleanup succeeded until running and pending counts reach zero.
- Stopping ECS tasks does not remove other potentially billable AWS resources.
- If AWS account restrictions prevent recovery, contact AWS Support and explain that you need to stop billable resources.

## Security

Never place AWS access keys, secret keys, session tokens, or Terraform state contents in this document.