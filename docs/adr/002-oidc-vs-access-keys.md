# ADR-002: GitHub OIDC vs. Stored AWS Access Keys

**Status:** Accepted  
**Project:** CloudPipeline  
**Date:** October 2026

## Context

CloudPipeline uses GitHub Actions to build Docker images, push them to Amazon ECR, and update an Amazon ECS service.

The pipeline needs permission to interact with AWS.

A traditional solution is storing an AWS access key ID and secret access key as GitHub repository secrets. However, these are long-lived credentials that can be exposed or misused if improperly managed.

Our project prioritizes keyless authentication and least privilege.

## Decision

Use **GitHub Actions OIDC federation with AWS IAM roles**.

We configured an IAM role named `pipewright-github-deploy` that GitHub Actions can assume using `sts:AssumeRoleWithWebIdentity`.

The IAM trust policy restricts access to our GitHub repository:

`ahmad-abdulmajid/cloudpipeline-app`

And the trusted branch:

`main`

GitHub Actions requests an OIDC identity token. AWS verifies its claims against the IAM role's trust policy and issues temporary AWS credentials.

No long-lived AWS access keys are stored in GitHub repository secrets.

## Alternatives Considered

### AWS Access Keys Stored in GitHub Secrets

**Advantages:**
- Straightforward initial configuration.
- Supported by AWS CLI and deployment tooling.

**Disadvantages:**
- Long-lived credentials require rotation and revocation.
- Exposed credentials may remain usable until disabled.
- Adds secret-management responsibilities.

### Self-Hosted GitHub Actions Runner With AWS Instance Role

**Advantages:**
- Can use IAM roles attached to AWS compute.
- Avoids distributing permanent AWS credentials.

**Disadvantages:**
- Requires managing and securing the runner infrastructure.
- Adds operational complexity and potentially higher costs.

## Consequences

### Positive

- No permanent AWS access keys in the GitHub Actions configuration.
- Temporary credentials expire automatically.
- The trust policy restricts which repository and branch can assume the role.
- IAM permissions limit the AWS operations available to the pipeline.
- Demonstrates federation and least-privilege security principles.

### Negative

- OIDC configuration requires understanding identity providers, token claims, IAM roles, and trust policies.
- Incorrect trust policy conditions can prevent authentication.
- IAM permissions must be updated when the deployment workflow requires additional operations.

## Security Controls

- Use the IAM OIDC provider for GitHub Actions.
- Restrict the role trust policy to the designated repository and `main` branch.
- Grant only the GitHub Actions job that needs AWS authentication `id-token: write`.
- Grant the deployment role permissions needed for ECR, ECS, and narrowly scoped `iam:PassRole`.
- Do not store AWS access keys, secret access keys, or credentials files in Git.
- Keep Terraform state and local environment files out of version control.

## Problems Encountered

During development, the GitHub Actions workflow initially failed with:

`Not authorized to perform sts:AssumeRoleWithWebIdentity`

The problem was associated with the AWS role assumption configuration.

We reviewed and corrected the IAM trust and permission configuration, then reran GitHub Actions.

The OIDC authentication job subsequently completed successfully.

## Outcome

GitHub Actions successfully authenticated to AWS through OIDC, pushed Docker images to Amazon ECR, and registered ECS task definition revisions.

This validated our decision to use temporary federated credentials rather than stored AWS access keys.
