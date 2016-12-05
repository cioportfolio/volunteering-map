#UK Charity Database and Browser

Builds a geocoded database of UK charities and companies and provides a web page to find charities, companies and volunteer opportunities in an area. The intention is that local charities and businesses can find each other an collaborate to drive up volunteering and giving back. 

Further background on this project can be found [here](#background).

Issues and ideas can be found [here](#on-going-development).

##Setup

###Node.js
Make sure you have [Node.js](http://nodejs.org/) and the [Heroku Toolbelt](https://toolbelt.heroku.com/) installed.
```sh
$ git clone <this repository>
$ cd nodejs
```
###API keys
Obtain a companies house api key from [here](https://developer.companieshouse.gov.uk/api/docs/index/gettingStarted.html)

Obtain a google geocode api key from [here](https://developers.google.com/maps/documentation/javascript/get-api-key)

###Database
Create a firebase app [here](https://firebase.google.com/)

Add the initial counters to your database through the firebase dashboard

```
counters
|
+-charity
|   |
|   +-start: 200000
|   |
|   +-next: 200000
|   |
|   +-end: 1200000
|
+-company
    |
    +-start: 118
    |
    +-next: 118
    |
    +-end: 1000000
```
Use the firebase console to obtain your database secret

Set your firebase security rules using the dashboard. Some basic settings are provided below.

```
{
    "rules": {
        ".read": true,
        ".write": false,
        "feature" : {
          "charity" : {
            ".indexOn": ["g"]
          },
          "company" : {
            ".indexOn": ["g"]
          }
        }
    }
}
```
###Post code locations
Download an initial set of post code locations. One possible source is the csv file [here](https://www.freemaptools.com/download-uk-postcode-lat-lng.htm).
##Local running
Create a .env file to define environment variables for local running.

```
CLEANUP=0 \\not currently used
MAPINTERVAL=0 \\not currently used
MAPBATCH=500 \\maximum number of organisations to returned in a geographic query
CHARITY=2000 \\milliseconds to delay between queries to the charity commission API to avoid rate limits
COMPANY=2000 \\milliseconds to delay between queries to the companies house api to avoid rate limits
FIREBASEKEY=<secret> \\secret key for your firebase database
GEO=35000 \\milliseconds to delay between queries to the google geocode api to avoid rate and day limits
GOOGLEKEY=<API key> \\key for your google api account
COMPANYKEY=<Companies house API Key> \\key for your companies house account
```
Run a local version of the application using the heroku toolbelt

```
$ heroku local
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```
$ heroku create
```

Define the environment variables using the heroku console or use the heroku cli.

```
$ heroku config:set ... = ...
```

Deploy to heroku via git push

```
$ git push heroku master
$ heroku open
```
or

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Documentation

For more information about using Node.js on Heroku, see these Dev Center articles:

- [Getting Started with Node.js on Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Node.js on Heroku](https://devcenter.heroku.com/categories/nodejs)
- [Best Practices for Node.js Development](https://devcenter.heroku.com/articles/node-best-practices)

##Background
This idea started a few months ago at a government sponsored ["Civic Hack"](https://www.gov.uk/government/news/cabinet-office-holds-the-first-ever-uk-job-hack). One of the challenges that was identified was that many charities were struggling to tap into business skills (such as financial planning) and companies were willing to offer more support. The obstacle was how to match this demand and supply. Services like [Team London](http://volunteerteam.london.gov.uk/) satisfied part of this need but, because there are a lot of these sorts of portal, charities often publish their requirements in one place and volunteers declare their availability somewhere else. Another obstacle is that the volunteering portals use filters like, local authority areas, which are not very user oriented. I have been exploring other ways of making this information accessible to people to drive up successful volunteering.

The current [BETA app](http://ukcharity.herokuapp.com) illustrates one way of doing this. Using registered office addresses medium sized charities and companies could see who their neighbours are and reach out to collaborate. Registered offices does not work so well for very small organisations (who probably use the office address of their accountant) or very large ones (which will only show an administrative head office).

I am currently talkng to the developers behind Team London and similar sites to see if they will make their registers of volunteers and volunteering opportunities available in a similar form.

##On-going Development
- Upload details of volunteers and volunteer opportunities from volunteering portals (with permission). Do-It has been included and other portals are considering the idea.
- Provide a way for charities, companies and individuals to provide information not held in existing registers (e.g. regional and local offices)
- Allow people to filter results by type of voluntary activities or time.
- Provide a way for people to donate additional resources (e.g. hosting, geocoding) rather than create a separate instance. Requires providing limited firebase database access without exposing keys.
- Define an open standard for exchange of volunteering information, possibly based on the [job posting standard](https://schema.org/JobPosting), so that charities can publish what they need and companies and individuals can publish what they can offer.
