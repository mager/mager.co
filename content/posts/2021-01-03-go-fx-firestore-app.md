---
title: "Building a coffee API with Go Fx and Firestore"
date: "2021-01-03T23:59:59.000Z"
description: "A step-by-step walkthrough of building a Go Fx app using Firestore to build a database of coffee beans & roasters and an API to fetch & update data."
template: post
draft: false
slug: go-fx-firestore-app-coffee-database
tags:
  - "Cafebean"
  - "Google Cloud"
category: "Code"
---

In my quest to build a [coffee-sharing app](https://cafebean.org) (think [Untappd](https://untappd.com/) for coffee), the main thing that's been holding me back is an open dataset with a ton of coffee beans and roasters. I've long searched for something like this but it doesn't seem to exist yet, so I decided to build the dataset myself in hopes that others will help me populate it.

It also would be great if this was accessible via a simple REST API. I've built APIs before with NodeJS, Elixir, and Python, but I haven't worked too much with Go. I've been using it a lot more at work, and it's quickly becoming my language of choice when building something new.

I've been meaning to try Uber's [Go Fx](https://github.com/uber-go/fx) library and Google's [Firestore database](https://cloud.google.com/firestore) and they have great Go libraries so I decided to dive in and build something over holiday break.

## Initial Setup

_Note: This post will take you from a blank `main.go` file to a working, deployed application in the cloud. We'll be using Google Cloud Platform and everything we do is covered under the free plan, but you will have to create a billing account._

Start by creating a new folder to house your project. For me, I just use my home folder in a `Code` folder. My working directory is `/Users/mager/Code/caffy-beans-example`.

Change into your new directory and [make sure you have Go installed](https://golang.org/doc/install). Initialize a new Go module:

```shell
> go mod init github.com/mager/caffy-beans-example
go: creating new go.mod: module github.com/mager/caffy-beans-example
```

Go modules are nice because you don't have to manually add packages; IDEs like [VSCode](https://code.visualstudio.com/docs/languages/go) and [GoLand](https://www.jetbrains.com/go/) will automatically add them when you start typing, and when you run `go run` or `go test`, they will automatically be included in `go.mod` (which keeps a list of a project's dependencies).

I'm using `github.com/mager/caffy-beans-example` because I intend on hosting this code on Github, but your folder structure could be anything. Read more about Go modules [here](https://github.com/golang/go/wiki/Modules#gomod).

## Go Fx & Hello World

Let's start by getting a [Go Fx](https://github.com/uber-go/fx) app to Hello World.

Fx is built around [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection) and modularity.

An Fx application has multiple "options" (based on the [functional options paradigm](https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis)):

- Provide options, which are basically lazy constructors. Imagine initializing a logger but not doing anything with it yet.
- Invoke options, where the constructors are invoked and introduced to the rest of the application. We also get access to the "lifecycle interface", which is a series of hooks or callbacks that let us run code during the startup & shutdown phases of your app.

We'll build an Fx app that has a few providers:

- Logger
- Router
- Database
- Config

Let's get started by creating a `main.go` file with a `main` function:

```go
package main

import (
	"fmt"

	"go.uber.org/fx"
)

func main() {
	fx.New(
		fx.Invoke(Register),
	).Run()
}

func Register() {
	fmt.Println("Hello, World!")
}

```

In the above example, we have a simple fx application that doesn't have any providers yet. `fx.New` currently just has a single invocation (the `Register` function). When we start adding providers soon, you'll see how the constructors are passed to `Register`.

`New()` returns an `fx.App` and we call `Run()` on it, which is the standard way to run an fx app. There are other granular methods like `Start()`, `Stop()`, `Done()`, `Err()`, but our app isn't that complex.

Run `go run main.go` and you should see the following output:

```shell
{"level":"info","ts":1609709590.39464,"msg":"providing","type":"fx.Lifecycle","constructor":"go.uber.org/fx.New.func1()"}
{"level":"info","ts":1609709590.394745,"msg":"providing","type":"fx.Shutdowner","constructor":"go.uber.org/fx.(*App).shutdowner-fm()"}
{"level":"info","ts":1609709590.394766,"msg":"providing","type":"fx.DotGraph","constructor":"go.uber.org/fx.(*App).dotGraph-fm()"}
{"level":"info","ts":1609709590.394778,"msg":"invoke","function":"main.Register()"}
Hello, World!
{"level":"info","ts":1609709590.395226,"msg":"running"}
```

We can see that we have a few log statements, and there's our `Hello, World!` just before the app gets running.

## Adding a real logger

Instead of just using `fmt`, we want to use a real logger in this application. Let's add a `logger` provider and initialize a [`zap`](https://github.com/uber-go/zap) logger. I chose this logger because it's fast and works nicely with structured data.

Create a new folder called `logger` and add `logger.go`:

```go
package logger

import (
	"go.uber.org/zap"
)

// ProvideLogger provides a zap logger
func ProvideLogger() *zap.SugaredLogger {
	logger, _ := zap.NewProduction()
	return logger.Sugar()
}

var Options = ProvideLogger
```

The `logging` package returns a function that initializes the logger.

Update your `main.go` file to the following:

```go
package main

import (
	"github.com/mager/caffy-beans-example/logger"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func main() {
	fx.New(
		fx.Provide(
			logger.Options,
		),
		fx.Invoke(Register),
	).Run()
}

func Register(logger *zap.SugaredLogger) {
	logger.Info("Hello, World!")
}
```

Now `fx.Provide` function collects all the options and passes them to the invoke function. We updated the `Register` signature to include the `logger` and we've replaced the print statement with `logger.Info`.

If you restart your server (`go run main.go`) again, you'll see some better logging:

```shell
{"level":"info","ts":1609712168.326265,"msg":"providing","type":"*zap.SugaredLogger","constructor":"github.com/mager/caffy-beans-example/logger.ProvideLogger()"}
{"level":"info","ts":1609712168.326376,"msg":"providing","type":"fx.Lifecycle","constructor":"go.uber.org/fx.New.func1()"}
{"level":"info","ts":1609712168.326391,"msg":"providing","type":"fx.Shutdowner","constructor":"go.uber.org/fx.(*App).shutdowner-fm()"}
{"level":"info","ts":1609712168.326431,"msg":"providing","type":"fx.DotGraph","constructor":"go.uber.org/fx.(*App).dotGraph-fm()"}
{"level":"info","ts":1609712168.32647,"msg":"invoke","function":"main.Register()"}
{"level":"info","ts":1609712168.3265889,"caller":"caffy-beans-example/main.go:19","msg":"Hello, World!"}
{"level":"info","ts":1609712168.327046,"msg":"running"}
```

## Adding a router

We're building an API so we need to add some routes. Let's add a [`mux`](https://github.com/gorilla/mux) router provider. Create a `router` folder with `router.go`:

```go
package router

import (
	"net/http"

	"github.com/gorilla/mux"
)

// ProvideRouter provides a gorilla mux router
func ProvideRouter() *mux.Router {
	var router = mux.NewRouter()
	router.Use(jsonMiddleware)
	return router
}

// jsonMiddleware makes sure that every response is JSON
func jsonMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

var Options = ProvideRouter
```

This `router` package initializes a `mux.Router` and adds some middleware to ensure that all HTTP responses have a specific `Content-Type` header added.

Let's update `main.go`:

```go
package main

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mager/caffy-beans-example/logger"
	"github.com/mager/caffy-beans-example/router"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func main() {
	fx.New(
		fx.Provide(
			logger.Options,
			router.Options,
		),
		fx.Invoke(Register),
	).Run()
}

func Register(logger *zap.SugaredLogger, router *mux.Router) {
	addr := ":8080"
	logger.Info("Listening on ", addr)
	go http.ListenAndServe(addr, router)
}
```

We've added router options to `fx.Provide` and also updated the signature of `Register` to include the `router`. The order of these doesn't matter but it's important to get the type right.

If you restart your server, you'll see a `Listening on :8080` message and if you visit http://localhost:8080 you should see a 404 page.

Before we add a route, let's upgrade our app to use Fx's lifecycle interface.

## Lifecycle hooks

Each Fx app has lifecycle hooks that let you tap into the start & stop phases of your app. This makes your app less panicy and gives you more control over _when_ things happen. Let's update `main.go` again:

```go
package main

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mager/caffy-beans-example/logger"
	"github.com/mager/caffy-beans-example/router"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func main() {
	fx.New(
		fx.Provide(
			logger.Options,
			router.Options,
		),
		fx.Invoke(Register),
	).Run()
}

func Register(
	lc fx.Lifecycle,
	logger *zap.SugaredLogger,
	router *mux.Router,
) {
	lc.Append(
		fx.Hook{
			OnStart: func(context.Context) error {
				addr := ":8080"
				logger.Info("Listening on ", addr)
				go http.ListenAndServe(addr, router)
				return nil
			},
			OnStop: func(context.Context) error {
				defer logger.Sync()
				return nil
			},
		},
	)

}
```

We add `router.Options` to the `Provide` function and the `Register` function now has 3 arguments: `fx.Lifecycle`, `*zap.SugaredLogger`, and `*mux.Router`. The order of these doesn't matter, but I prefer to add `lc` first be it's included with `fx`.

We append these lifecycle hooks and now the server starts listening `OnStart` and we've added some cleanup for `logger` in the `OnStop`.

## Adding a route handler

Let's add a simple route handler for fetching a list of beans. Create a folder called `route_handler` and a `route_handler.go`:

```go
package router_handler

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

// Handler struct for HTTP requests
type Handler struct {
	logger *zap.SugaredLogger
	router *mux.Router
}

// New creates a Handler struct
func New(logger *zap.SugaredLogger, router *mux.Router) *Handler {
	h := Handler{logger, router}
	h.registerRoutes()

	return &h
}

// RegisterRoutes registers all the routes for the route handler
func (h *Handler) registerRoutes() {
	h.router.HandleFunc("/beans", h.getBeans).Methods("GET")
}

// Bean represents a coffee bean in our API
type Bean struct {
	Flavors []string `json:"flavors"`
	Name    string   `json:"name"`
	Roaster string   `json:"roaster"`
	Shade   string   `json:"shade"`
}

// BeansResp is the response for the GET /beans endpoint
type BeansResp struct {
	Beans []Bean `json:"beans"`
}

// getBeans is the route handler for the GET /beans endpoint
func (h *Handler) getBeans(w http.ResponseWriter, r *http.Request) {
	var beans = make([]Bean, 0, 1)
	var b = Bean{
		Name:    "Big Hugs",
		Roaster: "Dark Matter",
		Shade:   "dark",
		Flavors: []string{"raspberry", "hot fudge", "lemon"},
	}
	beans = append(beans, b)

	json.NewEncoder(w).Encode(&BeansResp{beans})
}
```

There's a lot going on here. I'll summarize:

- We created a `Handler` struct which has our logger & router
- The `New` function calls the `registerRoutes` which registers our route and ensures that all GET requests to `/beans` go to our handler
- The `Bean` struct defines the coffee bean (we'll do more with this later)
- The `getBeans` handler has some hardcoded data and returns a `BeansResp` which is just a list of `Bean` records

Let's update `main.go` next. Right below the `lc.Append` in our `Register` function, call the route handler:

```go
package main

import (
	"context"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/mux"
	"github.com/mager/caffy-beans-example/logger"
	"github.com/mager/caffy-beans-example/router"
	handler "github.com/mager/caffy-beans-example/route_handler"  // New
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func main() {
	fx.New(
		fx.Provide(
			logger.Options,
			router.Options,
		),
		fx.Invoke(Register),
	).Run()
}

func Register(
	lc fx.Lifecycle,
	logger *zap.SugaredLogger,
	router *mux.Router,
) {
	lc.Append(
		fx.Hook{
			OnStart: func(context.Context) error {
				addr := ":8080"
				logger.Info("Listening on ", addr)
				go http.ListenAndServe(addr, router)
				return nil
			},
			OnStop: func(context.Context) error {
				defer logger.Sync()
				return nil
			},
		},
	)

	handler.New(logger, router)  // New
}

```

Restart your server and make an `http` request to `http://localhost:8080/beans`:

```shell
curl http://localhost:8080/beans
```

The response:

```json
{
  "beans": [
    {
      "flavors": ["raspberry", "hot fudge", "lemon"],
      "name": "Big Hugs",
      "roaster": "Dark Matter",
      "shade": "dark"
    }
  ]
}
```

Even though this is hardcoded data, we have a working API. Let's add some real data now.

## Adding a database

I chose Google's [Firestore](https://firebase.google.com/docs/firestore) because the dataset I'm creating isn't relational so a [document database](https://en.wikipedia.org/wiki/Document-oriented_database) makes more sense. And Firestore is easy to get up and running fast.

Make sure you have `gcloud` installed and you have set up a [billing account](https://cloud.google.com/billing/docs/how-to/manage-billing-account). Also, set yourself a reminder to tear down these resources we're about to create.

- Run `gcloud projects create <your-project-name>` to create a new project

```shell
> gcloud projects create caffy-beans-example
Create in progress for [https://cloudresourcemanager.googleapis.com/v1/projects/caffy-beans-example].
Waiting for [operations/cp.01234567890] to finish...done.
Enabling service [cloudapis.googleapis.com] on project [caffy-beans-example]...
Operation "operations/acf.00000000-0000-0000-0000-000000000" finished successfully.
```

- Run `gcloud config set project <your-project-name>` to set your current project

- Run `gcloud app create` to create an App Engine app (UPDATE: I recommend checking out [Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy) instead of App Engine)

You'll be prompted to chose a region, remember it for the next step.

- Run `gcloud firestore databases create --region=<your-region>` to create a database

```shell
> gcloud firestore databases create --region=us-central
Waiting for operation [apps/caffy-beans-example/operations/00000000-0000-0000-0000-000000000000] to complete...done.
Success! Selected Google Cloud Firestore Native database for caffy-beans-example
```

You should be able to see an empty Firestore database if you visit [https://console.cloud.google.com/firestore/data?project=your-project-name](https://console.cloud.google.com/firestore/data?project=your-project-name).

![](/media/2021-01-03-go-fx-firestore-app/firestore-empty.png)

Let's add some data. Create a new collection called `beans` and some fields:

| Field     | Type     | Value                  |
| --------- | -------- | ---------------------- |
| `roaster` | `string` | `Stumptown`            |
| `name`    | `string` | `Hair Bender`          |
| `flavors` | `array`  | `blackberry`, `toffee` |
| `shade`   | `string` | `light`                |

![](/media/2021-01-03-go-fx-firestore-app/firestore-bean.png)

You should be able to view the data after creating it:

![](/media/2021-01-03-go-fx-firestore-app/firestore-bean-1.png)

Now let's give our local application access to Firebase.

- Run `gcloud iam service-accounts create local-dev` to create a service account

- Run `gcloud projects add-iam-policy-binding <your-project-name> --member="serviceAccount:local-dev@<your-project-name>.iam.gserviceaccount.com" --role="roles/owner"` to create an IAM policy that links to your service account

```shell
> gcloud projects add-iam-policy-binding caffy-beans-example --member="serviceAccount:local-dev@caffy-beans-example.iam.gserviceaccount.com" --role="roles/owner"
Updated IAM policy for project [caffy-beans-example].
bindings:
- members:
  - serviceAccount:caffy-beans-example@appspot.gserviceaccount.com
  role: roles/editor
- members:
  - serviceAccount:service-0123456789@firebase-rules.iam.gserviceaccount.com
  role: roles/firebaserules.system
- members:
  - serviceAccount:local-dev@caffy-beans-example.iam.gserviceaccount.com
  - user:magerleagues@gmail.com
  role: roles/owner
etag: AbCdE_Fg-v0=
version: 1
```

- Run `gcloud iam service-accounts keys create credentials.json --iam-account=local-dev@<your-project-name>.iam.gserviceaccount.com` to generate a key for our application to authenticate

```shell
> gcloud iam service-accounts keys create credentials.json --iam-account=local-dev@caffy-beans-example.iam.gserviceaccount.com
created key [123456789] of type [json] as [credentials.json] for [local-dev@caffy-beans-example.iam.gserviceaccount.com]
```

- Run `export GOOGLE_APPLICATION_CREDENTIALS=$(echo $(pwd)/credentials.json)` to set the environment variable that the Firestore API is expecting (check out the [docs](https://cloud.google.com/docs/authentication/production)). I recommend adding a `.gitignore` file and adding `credentials.json` now so you don't accidentally publish this file.

Now we can add the `db` module to our app. Create a `db` folder with `db.go`:

```go
package db

import (
	"context"
	"log"

	"cloud.google.com/go/firestore"
)

// ProvideDB provides a firestore client
func ProvideDB() *firestore.Client {
	projectID := "your-project-id"

	client, err := firestore.NewClient(context.TODO(), projectID)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}
	return client
}

var Options = ProvideDB
```

Here, we're just initializing the Firestore client and providing it as an `fx.Option`.

And let's update `main.go` too:

```go
package main

import (
	"context"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/mux"
	"github.com/mager/caffy-beans-example/database"
	"github.com/mager/caffy-beans-example/logger"
	"github.com/mager/caffy-beans-example/router"
	handler "github.com/mager/caffy-beans-example/route_handler"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func main() {
	fx.New(
		fx.Provide(
			database.Options,
			logger.Options,
			router.Options,
		),
		fx.Invoke(Register),
	).Run()
}

func Register(
	lc fx.Lifecycle,
	database *firestore.Client,
	logger *zap.SugaredLogger,
	router *mux.Router,
) {
	lc.Append(
		fx.Hook{
			OnStart: func(context.Context) error {
				addr := ":8080"
				logger.Info("Listening on ", addr)
				go http.ListenAndServe(addr, router)
				return nil
			},
			OnStop: func(context.Context) error {
				defer logger.Sync()
				defer database.Close()
				return nil
			},
		},
	)

	handler.New(logger, router, database)  // Updated
}
```

We added the `database` provider and also some cleanup in the `OnStop`. Next, we need to refactor the handler to include the `database` argument.

In `route_handler.go`, update `Handler` and `New`:

```go
// Handler struct for HTTP requests
type Handler struct {
	logger   *zap.SugaredLogger
	router   *mux.Router
	database *firestore.Client
}

// New creates a Handler struct
func New(logger *zap.SugaredLogger, router *mux.Router, database *firestore.Client) *Handler {
	h := Handler{logger, router, database}
	h.registerRoutes()

	return &h
}
```

Now we have access to `database` in our route handlers. Let's update `getBeans` function in `route_handler.go` to use real data:

```go
func (h *Handler) getBeans(w http.ResponseWriter, r *http.Request) {
	var resp = &BeansResp{}

	// Call Firestore API and fetch the beans collection
	iter := h.database.Collection("beans").Documents(context.TODO())
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			h.logger.Fatalf("Failed to iterate: %v", err)
		}

		var b Bean
		doc.DataTo(&b)
		resp.Beans = append(resp.Beans, b)
	}

	json.NewEncoder(w).Encode(resp)
}
```

The Firestore client ([docs](https://pkg.go.dev/cloud.google.com/go/firestore)) grabs all of the documents in the `beans` collection and we fill the `BeansResp` struct with the data and then return JSON.

Let's also update our `Bean` struct to include the `firestore` struct tags. In our case, the values are the same, but you might want to use different keys for your JSON:

```go
// Bean represents a coffee bean in our API & database
type Bean struct {
	Flavors []string `firestore:"flavors" json:"flavors"`
	Name    string   `firestore:"name" json:"name"`
	Roaster string   `firestore:"roaster" json:"roaster"`
	Shade   string   `firestore:"shade" json:"shade"`
}
```

If you make a `GET` request to http://localhost:8080/beans you should see the data from Firestore:

```shell
curl http://localhost:8080/beans
```

The response:

```json
{
  "beans": [
    {
      "flavors": ["blackberry", "toffee"],
      "name": "Hair Bender",
      "roaster": "Stumptown",
      "shade": "light"
    }
  ]
}
```

## Adding data

Now that we've fetched data, it's pretty easy to add a new router handler for a `POST` request to add a bean to the database.

Let's update our `registerRoutes` function in `main.go`:

```go
// RegisterRoutes for all http endpoints
func (h *Handler) registerRoutes() {
	h.router.HandleFunc("/beans", h.getBeans).Methods("GET")
	h.router.HandleFunc("/beans", h.addBean).Methods("POST")  // New
}
```

And let's add some structs for the request & response:

```go
// AddBeanReq is the request body for adding a Bean
type AddBeanReq struct {
	Flavors []string `json:"flavors"`
	Name    string   `json:"name"`
	Roaster string   `json:"roaster"`
	Shade   string   `json:"shade"`
}

// AddBeanResp is the response from the POST /beans endpoint
type AddBeanResp struct {
	ID string `json:"id"`
}
```

And here's the new `addBean` router handler:

```go
func (h *Handler) addBean(w http.ResponseWriter, r *http.Request) {
	var (
		req  AddBeanReq  // The HTTP request
		resp = &AddBeanResp{}  // The HTTP response
		ctx  = context.TODO()
		err  error
	)

	// Make sure the JSON is valid
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Make sure roaster exists - we'll talk about this below
	iter := h.database.Collection("roasters").Where("name", "==", req.Roaster).Documents(ctx)
	for {
		doc, err := iter.Next()
		if doc == nil {
			http.Error(w, "invalid roaster", http.StatusBadRequest)
			return
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		break
	}

	// Add the bean
	doc, _, err := h.database.Collection("beans").Add(ctx, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp.ID = doc.ID

	// Return the response as JSON
	json.NewEncoder(w).Encode(resp)
}
```

Let's review what's in this router handler:

- First, we make sure the request JSON is properly formatted
- Then, we check another collection called `roasters` to make sure the bean being added is from a supported roaster (we'll add this collection soon)
- Finally, we add the bean via Firestore's `Collection.Add` function and return the ID in the response

Restart the server (`go run main.go`) and try adding a bean with a `POST` request to http://localhost:8080/beans.

```shell
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"name":"Brazil","shade":"light","flavors":["coconut","hard candy"],"roaster":"Ipsento"}' \
  http://localhost:8080/beans

```

```http
HTTP/1.1 400 Bad Request
Content-Length: 16
Content-Type: text/plain; charset=utf-8
Date: Mon, 04 Jan 2021 16:35:46 GMT
X-Content-Type-Options: nosniff

invalid roaster
```

This is expected because we haven't added the `roasters` collection, so let's do that real quick. Go back to the GCP dashboard and add a collection:

![](/media/2021-01-03-go-fx-firestore-app/firestore-roaster.png)

The data looks like this:

| Field  | Type     | Value                 |
| ------ | -------- | --------------------- |
| `name` | `string` | `Ipsento`             |
| `url`  | `string` | `https://ipsento.com` |

![](/media/2021-01-03-go-fx-firestore-app/firestore-roaster-1.png)

Now let's retry the request:

```shell
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"name":"Brazil","shade":"light","flavors":["coconut","hard candy"],"roaster":"Ipsento"}' \
  http://localhost:8080/beans

```

The response:

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
    "id": "TP44GkIwwtESK9R7KHZ9"
}
```

Awesome, it works. And if you `curl http://localhost:8080/beans`, you'll see the new bean in the list.

## Extending the app

This post is getting a bit long, but there are still a few things to mention.

We can move our config into a provider, and I'll show you how to deploy the app.

### Adding a config

Create a new folder called `config` with `base.yaml`:

```yaml
application:
  address: :8080
```

And `config.go` in the same directory:

```go
package config

import (
	"io/ioutil"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Application `yaml:"application"`
}

type Application struct {
	Address string `yaml:"address"`
}

func ProvideConfig() *Config {
	conf := Config{}
	data, err := ioutil.ReadFile("config/base.yaml")
	if err != nil {
		panic(err)
	}

	err = yaml.Unmarshal([]byte(data), &conf)
	if err != nil {
		panic(err)
	}

	return &conf
}

var Options = ProvideConfig
```

Nothing fancy here, just reading the YAML file and converting the data to a Go struct. Putting the config in its own module lets us easily add new environments in the future.

Let's update `main.go` next:

```go
package main

import (
	"context"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/mux"
	"github.com/mager/caffy-beans-example/config"
	"github.com/mager/caffy-beans-example/database"
	"github.com/mager/caffy-beans-example/logger"
	"github.com/mager/caffy-beans-example/router"
	handler "github.com/mager/caffy-beans-example/route_handler"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

func main() {
	fx.New(
		fx.Provide(
			config.Options,  // New
			database.Options,
			logger.Options,
			router.Options,
		),
		fx.Invoke(Register),
	).Run()
}

func Register(
	lc fx.Lifecycle,
	cfg *config.Config,
	database *firestore.Client,
	logger *zap.SugaredLogger,
	router *mux.Router,
) {
	lc.Append(
		fx.Hook{
			OnStart: func(context.Context) error {
				logger.Info("Listening on ", cfg.Application.Address)  // Refactored
				go http.ListenAndServe(cfg.Application.Address, router)  // Refactored
				return nil
			},
			OnStop: func(context.Context) error {
				defer logger.Sync()
				defer database.Close()
				return nil
			},
		},
	)

	handler.New(logger, router, database)
}
```

Now we don't have to hardcode the app address anymore. Restart your server and make a request to verify it's still working.

### Deploying the app

To deploy the app to App Engine:

- Add a [`app.yaml`](https://cloud.google.com/appengine/docs/standard/go/config/appref) file in your root directory like this:

```yaml
runtime: go115

instance_class: F1
```

- Run `gcloud services enable cloudbuild.googleapis.com` to enable Cloud Build

- Run `gcloud app deploy` to deploy the app to App Engine:

```shell
> gcloud app deploy
Services to deploy:

descriptor:      [/Users/mager/Code/caffy-beans-example/app.yaml]
source:          [/Users/mager/Code/caffy-beans-example]
target project:  [caffy-beans-example]
target service:  [default]
target version:  [20210104t105544]
target url:      [https://caffy-beans-example.uc.r.appspot.com]


Do you want to continue (Y/n)?  Y

Beginning deployment of service [default]...
╔════════════════════════════════════════════════════════════╗
╠═ Uploading 12 files to Google Cloud Storage               ═╣
╚════════════════════════════════════════════════════════════╝
File upload done.
Deployed service [default] to [https://caffy-beans-example.uc.r.appspot.com]
```

You should be able to see your API working if you do `gcloud app browse` and append `/beans` to the URL.

### Adding tracing

I also played around with adding Jaeger tracing to the app and all I had to do was:

- Run `docker run -d -p 6831:6831/udp -p 16686:16686 jaegertracing/all-in-one:latest` to get Jaeger running in a container locally
- Add a `tracing` provider using the default configs from the [OpenTracing quickstart guide](https://opentracing.io/guides/golang/quick-start/)

### Adding pubsub

Here's how easy it was to add a [pubsub events provider](https://github.com/mager/cafebean-api/pull/4).

### Containerizing the app

Also, if you wanted to run the application in a container, you could have a `Dockerfile` like so:

```docker
FROM golang:latest

RUN mkdir -p /app

WORKDIR /app

ADD . /app

ENV GOOGLE_APPLICATION_CREDENTIALS="./credentials.json"

RUN go build ./main.go

CMD ["./main"]
```

## Conclusion

Working with Fx & Firestore was fun, and I'm thankful for the great docs & examples I saw online. Shoutout to Preslav Mihaylov for [his post](https://pmihaylov.com/shared-components-go-microservices/), which initially got me motivated to write about my experience. And special thanks to [Fred Hebert](https://ferd.ca/) and [Sequoia McDowell](https://sequoia.makes.software/) for help editing this post.

All of the code for this app can be found on Github ([https://github.com/mager/caffy-beans-example](https://github.com/mager/caffy-beans-example)).

Stay in touch on [Twitter](https://twitter.com/mager) and let me know if you have any feedback or questions about this post. Thanks and Happy Coding!
