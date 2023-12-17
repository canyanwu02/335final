const fs = require("fs");
const path = require("path");
const express = require("express");
const { urlencoded } = require("body-parser");
const app = express(); 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));
app.use(urlencoded({extended : true}));
process.stdin.setEncoding("utf8");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const portNumber = process.argv[2];
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://garaujo:Chapatis1022@cluster0.7uk1vgy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
const axios = require('axios');
app.use(express.static('public'));

const databaseAndCollectionTVShow = {db: "tvShowDB", collection:"FinalProjTV"};
const databaseAndCollectionMovie = {db: "movieDB", collection:"FinalProjMovie"};


const startServer = () => {
    const prompt = "Type stop to shutdown the server:";
    
    app.listen(portNumber);
    console.log(`Web server started and running at http://localhost:${portNumber}`);
    console.log(prompt);
};

const stopServer = (command) => {
  if (command === "stop") {
    console.log("Shutting Down Server");
    process.exit(0);
  } else {
    console.log(`Invalid command: ${command}`);
    process.stdout.write("Type stop to shutdown the server:");
    process.stdin.resume();
  }
};

async function insertMedia(client, databaseAndCollection, newMedia) {
    await client.connect();
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newMedia);
    await client.close();
}


app.get("/", (request, response) => { 
    response.render("index.ejs");
});
app.get("/movieInput", (request, response) => { 
    response.render("movieInput.ejs"); 
});
app.get("/tvshowInput", (request, response) => { 
    response.render("tvInput.ejs"); 
});
app.post("/movieInput", (request, response) => { 
    let name = request.body.name;
    const variables = {
        name: request.body.name,
        genre: request.body.genre
    };
    insertMedia(client, databaseAndCollectionMovie, variables); 
    response.render("afterInputMovie.ejs", { name: name });
});

app.post("/tvshowInput", (request, response) => { 
    let name = request.body.name;
    const variables = {
        name: name,
        genre: request.body.genre
    };
    insertMedia(client, databaseAndCollectionTVShow, variables); 
    response.render("afterInputTVShow.ejs", { name: name });
});

async function fetchMedia(client, databaseAndCollection) {
    await client.connect();
    const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);
    const media = await collection.find({}).toArray();
    await client.close();
    return media;
}

async function getMovieDetails(movieTitle) {
    const apiKey = process.env.API_KEY;
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieTitle)}&api_key=${apiKey}`;
    console.log("URL: ", url);

    try {
        const response = await axios.get(url);
        console.log("API Response: ", response.data);
        const firstMovie = response.data.results[0]; // Extracting only the first result
        return firstMovie ? [firstMovie] : []; // Returning an array with the first result or an empty array
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        return [];
    }
}


app.get("/getResult", async (request, response) => {
    await client.connect();
    const movies = await fetchMedia(client, databaseAndCollectionMovie);

    const movieDetails = await Promise.all(movies.map(m => getMovieDetails(m.name)));
    console.log("Movie Details: ", movieDetails); 

    response.render("getResult.ejs", { movies: movieDetails });
});

async function getTVShow(tvShow) {
  const apiKey = process.env.API_KEY;
  const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(tvShow)}&api_key=${apiKey}`;
  console.log("URL: ", url);

  try {
      const response = await axios.get(url);
      console.log("API Response: ", response.data);
      const firstTVShow = response.data.results[0]; 
      return firstTVShow ? [firstTVShow] : []; // returning an array with the first result or an empty array
  } catch (error) {
      console.error("Error fetching TV show details:", error.message);
      return [];
  }
}

app.get("/getTV", async (request, response) => {
  await client.connect();
  const tvShows = await fetchMedia(client, databaseAndCollectionTVShow);

  const tvShowDetails = await Promise.all(tvShows.map(tv => getTVShow(tv.name)));
  console.log("TV Show Details: ", tvShowDetails);

  response.render("getTV", { tvShows: tvShowDetails });
});





async function getTrending() {
  const apiKey = process.env.API_KEY;
  const url = `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=en-US`;
  console.log("URL: ", url);

  try {
    const response = await axios.get(url);
    console.log("API Response: ", response.data);
    
    // Get the top 10 trending movies
    const trendingMovies = response.data.results.slice(0, 10);

    return trendingMovies.length > 0 ? trendingMovies : [];
} catch (error) {
    console.error("Error fetching trending movies:", error.message);
    return [];
}

}

app.get("/getTrending", async (request, response) => {
  try {
      const results = await getTrending();

      // Create a table of movies with the title
      const movieTable = results.map(movie => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          overview: movie.overview,
          poster_path: movie.poster_path,
      }));

      // Return the movie table as JSON or render a template
      response.render("getTrending", { movieTable });
  } catch (error) {
      console.error("Error fetching trending movie data:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
  }
});

  /* get rid of all info*/

async function deleteMedia(client, databaseAndCollection) {
    try {
        await client.connect();
        const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);
        await collection.deleteMany({});
    } finally {
        await client.close();
    }
}


app.get("/remove", (request, response) => {
    const vars = { 
        port: `http://localhost:${portNumber}/remove`
    }
    response.render("remove", vars);
});

app.post("/remove", async (request, response) => {
  
  await deleteMedia(client, databaseAndCollectionMovie);
  await deleteMedia(client, databaseAndCollectionTVShow);

  response.render("removalConfirm");
});



const main = () => {
    if (process.argv.length !== 3) {
      console.error("Usage: node procesing.js portnumber");
      process.exit(0);
    }

    if (isNaN(portNumber)){  //ensures the port number is a number
        console.error("port number must be an integer (use 4000)");
        process.exit(0);
    }

    startServer();
  
    process.stdin.on('readable', () => {
      const dataIn = process.stdin.read();
  
      if (dataIn !== null) {
        const command = dataIn.trim();
        stopServer(command);
      }
    });
  
  };

main();