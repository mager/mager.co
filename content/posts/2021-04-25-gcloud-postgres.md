---
title: How to set up a Postgres on GCP without Cloud SQL
date: "2021-05-08T15:00:00.000Z"
description: "Here are some instructions on how to setup a Postgres database in the cloud, and access it from your other cloud services like Cloud Run. This is an alternative to the managed Cloud SQL service from Google, and is more affordable if you have a smaller use case."
template: post
draft: false
slug: gcloud-postgres-without-cloud-sql
tags:
  - "Postgres"
  - "Google Cloud"
  - "Database"
category: "Code"
---

When I started to build [Cafebean](https://cafebean.org) ([an open coffee bean database](http://localhost:8000/posts/2021-01-03-go-fx-firestore-app/)), I decided to use Firestore as my document database for the beans & roaster data. As I add the ability for users to reviews beans, I need a relational database for that. I chose [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) because I've used it in production before, and it's relatively straightforward to set up.

![](/media/2021-04-25-gcloud-postgres/beans-reviews-users.png)

Google actually offers a hosted version of Postgres which is higly reliable, and fully-featured, but it comes at a [higher price tag](https://cloud.google.com/sql/docs/pricing-examples).

CloudSQL's cheapest option is `$9` a month, whereas the option I'll show you below costs closer to `$3` dollars a month.

The [GCP Free Tier](https://cloud.google.com/free) comes with 1 free f1-micro Compute instance, so we'll take advantage of that.

In this post, I'll show you how I connected this Posgres instance my Golang app, which is deployed via Cloud Run. I used [this tutorial from Google as a guide](https://cloud.google.com/community/tutorials/setting-up-postgres).

## Initial Setup

For this example, I'm going to be using my `cafebean` project as an example, but feel free to name your project & resources anything you want.

Create a [Google Cloud project](https://console.cloud.google.com/project) and enable billing. Install the [Google Cloud SDK](https://cloud.google.com/sdk). Now it's time to [create an instance](https://console.cloud.google.com/compute/instancesAdd).

Enter a name for your instance and use the default region. In Machine Configuration, choose General Purpose, Series N1, Machine type f1-micro (1 vCPU, 614 MB memory). It seems like a dinky machine, but it's only serving one purpose: handing a single database connection to a single client. If my site grows, it should be easy to scale up.

![](/media/2021-04-25-gcloud-postgres/gcp-postgres-1.png)

NOTE: Compute Engine has a nice feature where you can deploy a container to an instance, and we could easily deploy the postgres image, but I'm going to show you how to install it manually.

For the boot disk, choose the latest Ubuntu version:

![](/media/2021-04-25-gcloud-postgres/gcp-postgres-2.png)

Finally, in the Firewall > Networking section, add a network tag:

![](/media/2021-04-25-gcloud-postgres/gcp-postgres-3.png)

Click Create and you should have an instance running in a few minutes.

```shell
❯ gcloud beta compute instances list
NAME           ZONE           MACHINE_TYPE  PREEMPTIBLE  INTERNAL_IP  EXTERNAL_IP   STATUS
cafebean-data  us-central1-a  f1-micro                   10.128.0.8   35.225.71.58  RUNNING
```

## Setting up Postgres

Let's connect to the instance with ssh:

```shell
> gcloud beta compute ssh "cafebean-data" \
    --zone "us-central1-a" \
    --project "cafebean"
```

Let's do a software update and install the latest Postgres libraries:

```shell
> sudo apt update
> sudo apt -y install postgresql-12 postgresql-client-12
```

Check to make sure it's running:

```shell
> systemctl status postgresql.service
> systemctl status postgresql@12-main.service
> systemctl is-enabled postgresql
```

You should see something like this:

![](/media/2021-04-25-gcloud-postgres/postgres-running.png)

Fire up `psql` with user `postgres`:

```shell
> sudo -u postgres psql postgres
```

Set a password:

```shell
postgres=# \password postgres
```

And let's add some data. First we'll create two tables: `users` and `reviews` (see diagram above):

```sql
CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY,
    email TEXT NOT NULL,
    username VARCHAR(20) NULL
);

CREATE TABLE reviews (
    review_id INT GENERATED ALWAYS AS IDENTITY,
    user_id INT,
    bean_ref VARCHAR(20) NOT NULL,
    rating FLOAT NULL,
    review TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Finally, let's add some dummy data so we can query it later:

```sql
INSERT INTO users(email, username)
    VALUES('test@test.com', 'testuser');

INSERT INTO reviews(user_id, bean_ref, rating, review)
    VALUES(1, '709xkHwG8QYitVsrgX2P', 4.3, 'Amazing');
```

Quit `postgres` with `\q`.

## Talking to the instance from your local machine

As it stands now, the instance is completely locked down from external traffic. To start, we'll update Postgres' settings to allow traffic our local IP only, and then later I'll show you how I connected to my app in Cloud Run.

Open the `pg_hba.conf` [config file](https://www.postgresql.org/docs/9.1/auth-pg-hba-conf.html) (HBA stands for host-based authentication):

```shell
> sudo vi /etc/postgresql/12/main/pg_hba.conf
```

Head to the bottom of the page and add you IP address (you can find your IP at [http://httpbin.org/ip](http://httpbin.org/ip)).

![](/media/2021-04-25-gcloud-postgres/pg_hba-conf-1.png)

Don't forget the `/32` subnet suffix.

Save the file and exit the code editor. We have to update one more file, `postgresql.conf`, and tell it to open up traffic to all IP addresses. Since we updated `pg_hba.conf` in the previous step, it should only allow traffic to our IP.

```shell
> sudo vi /etc/postgresql/12/main/postgresql.conf
```

Look for the `listen_addresses` rule (around line 59) and set it to `'*'`:

![](/media/2021-04-25-gcloud-postgres/postgresql-conf.png)

Save and close and restart Postgres:

```shell
> sudo service postgresql restart
```

Next, we'll create a firewall rule in GCP (do this from your local machine, not the ssh session):

```shell
> gcloud beta compute firewall-rules create cafebean-testing \
    --allow=tcp:5432 \
    --direction=INGRESS \
    --source-ranges=73.55.142.199/32 \
    --target-tags=cafebean-data
```

Verify that it was created with the command `gcloud beta compute firewall-rules describe cafebean-data`.

Now that your firewall rule is created, you should be able to connect to the instance with psql locally (you can install it with `brew install postgresql`). Find the external IP address of your instance:

```shell
> gcloud beta compute instances describe cafebean-data \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

And then connect (you will be promted for a password):

```shell
> psql -h 35.225.71.58 -p 5432 -U postgres -d postgres -W
```

If all goes well you should see the the postgres prompt. Feel free to run a query to test the data:

![](/media/2021-04-25-gcloud-postgres/postgres-local.png)

## Talking to the instance from your Cloud Run app

The Cafebean API is hosted on Cloud Run, and by default, the service is hosted on a dynamic IP. This doesn't work well with the security of our Postgres instance becasue it needs to know which IPs are allowed to access it. Luckily, it's pretty easy to route all of your Cloud Run requests through a [static outbound IP](https://cloud.google.com/run/docs/configuring/static-outbound-ip).

Here are the command I used to enable these network rules:

```shell
# Create a subnetwork
> gcloud beta compute networks subnets create cafebean-subnet \
    --range=10.124.0.0/28 \
    --network=default \
    --region=us-central1

# Create a VPC connector
> gcloud beta compute networks vpc-access connectors create cafebean-connector \
    --region=us-central1 \
    --subnet-project=cafebean \
    --subnet=cafebean-subnet

# Create a router
> gcloud beta compute routers create cafebean-router \
    --network=default \
    --region=us-central1

# Reserve a static IP address
> gcloud beta compute addresses create cafebean-api \
    --region=us-central1

# Create a NAT gateway
> gcloud beta compute routers nats create cafebean \
    --router=cafebean-router \
    --region=us-central1 \
    --nat-custom-subnet-ip-ranges=cafebean-subnet \
    --nat-external-ip-pool=cafebean-api
```

Now when I deploy a new version of the API, I add two new flags to the `gcloud run deploy` command:

```shell
> gcloud beta run deploy --image gcr.io/cafebean/cafebean-api \
    --platform managed \
    --vpc-connector=cafebean-connector \
    --vpc-egress=all
```

Once this is deployed, we can be sure that all API traffic is being served from a static IP.

```shell
❯ gcloud beta compute addresses list
NAME          ADDRESS/RANGE  TYPE      PURPOSE  NETWORK  REGION       SUBNET  STATUS
cafebean-api  34.67.158.60   EXTERNAL                    us-central1          IN_USE
```

Now we just need to update our Postgres `pg_hba.conf` file. `ssh` back into the instance and add your static IP to the list.

![](/media/2021-04-25-gcloud-postgres/pg_hba-conf-2.png)

Restart your postgres instance:

```shell
> sudo service postgresql restart
```

That's it. Your Cloud Run app can now talk to the Postgres server. If you want to see it in action, make a request to the API to [fetch all reviews](https://api.cafebean.org/reviews), or check out the [bean page for Ipsento Cascade Espresso](https://cafebean.org/beans/ipsento-cascade-espresso), which I've been using for test reviews.

![](/media/2021-04-25-gcloud-postgres/cafebean-review-page.png)

## Conclusion

It was pretty easy to set this up, and it's less expensive than Google's hosted SQL option, and almost just as good.

I hope you learned something from this post. As always, feel free to [reach out to me on Twitter](https://twitter.com/mager) if you have any questions or feedback.
