# AWS Infrastructure for Static Sites with CI/CD

This project provides a scalable and reusable AWS infrastructure for deploying static websites with an automated CI/CD pipeline. It streamlines the hosting, monitoring, and deployment of multiple static site projects using AWS services.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Parallel deploys

```bash
# deploy all stacks, up to 3 in parallel
npx cdk deploy --all --concurrency 3 --require-approval never

# max parallelism (fastest, but more likely to throttle)
npx cdk deploy --all --concurrency `<max_num>` --require-approval never
```

`--concurrency` defaults to `1` (sequential) — you must set it explicitly.
