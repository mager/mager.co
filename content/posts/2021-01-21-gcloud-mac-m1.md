---
title: How to install gcloud on an M1 Mac
date: "2021-01-21T14:00:00.000Z"
description: "If you're having trouble installing the gcloud CLI on your Mac m1, this should help."
template: blog
---

If you have the new [ARM64-based Mac with the M1 processor](https://www.apple.com/mac/m1/), you might run into this error installing the Google Cloud SDK:

```shell
ERROR: (gcloud.components.update) The following components are unknown [anthoscli].
```

Here's how I was able to install `gcloud`:

Install Python 3. At the time of this article, the latest stable version is 3.9.1. Use `pyenv`:

```shell
brew install pyenv
pyenv install 3.9.1
pyenv global 3.9.1
```

Set an env variable letting the `gcloud` installer know which version of Python to use:

```shell
export CLOUDSDK_PYTHON=python3
```

Download the SDK and start the install:

```shell
curl https://sdk.cloud.google.com | bash
```

If you run into the above error, manually run the `install.sh` script:

```shell
cd ~/google-cloud-sdk
./install.sh --override-components core gcloud-deps bq gcloud gsutil
```

- Restart your terminal and it should work:

```shell
gcloud help
```

## App Engine Trouble

As of Feb 2021, it's impossible to deploy a Go application to App Engine with `gcloud app deploy`. If you run `gcloud components install app-engine-go`, you'll get this error:

```shell
ERROR: (gcloud.components.install) The following components are unknown [app-engine-go].
```

I recommend switching to Cloud Run if you're using App Engine. It's pretty easy to do if you [follow these instructions](https://cloud.google.com/run/docs/quickstarts/build-and-deploy).

Hope this helped you! [Hit me up on Twitter](https://twitter.com/mager) if you have any comments/suggestions.
