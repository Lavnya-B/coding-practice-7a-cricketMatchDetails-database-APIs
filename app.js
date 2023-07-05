const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertPlayerDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchScoreDbObjectToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

//API 1

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
 SELECT
 *
 FROM
 player_details;`;
  const playersArray = await database.all(getPlayersQuery);

  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

//API 2

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
  SELECT * 
  FROM player_details 
  WHERE player_id = ${playerId};`;
  const playerDetails = await database.get(getPlayerQuery);
  response.send(convertPlayerDetailsDbObjectToResponseObject(playerDetails));
});

//API 3

app.put("/players/:playerId/", async (request, response) => {
  const { playerName } = request.body;
  const { playerId } = request.params;
  const updatePlayerQuery = `
  UPDATE
    player_details
  SET
    player_name = '${playerName}'
  WHERE
    player_id = ${playerId};`;

  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//API 4

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
  SELECT * 
  FROM match_details 
  WHERE match_id = ${matchId};`;
  const matchDetails = await database.get(getMatchDetailsQuery);
  response.send(convertMatchDetailsDbObjectToResponseObject(matchDetails));
});

//API 5

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerQuery = `
    SELECT 
      * 
    FROM 
      match_details
    WHERE 
      match_id IN (SELECT match_id FROM player_match_score WHERE player_id=${playerId});`;
  const matchesArray = await database.all(getMatchesOfPlayerQuery);

  response.send(
    matchesArray.map((eachMatch) =>
      convertMatchDetailsDbObjectToResponseObject(eachMatch)
    )
  );
});

//API 6

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatchQuery = `
    SELECT 
        player_details.player_id AS playerId,
	    player_details.player_name AS playerName
    FROM 
        player_match_score NATURAL JOIN player_details
    WHERE 
        match_id=${matchId}`;
  const playersArray = await database.all(getPlayersOfMatchQuery);

  response.send(playersArray);
});

//API 7

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStatsQuery = `
   SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const stats = await database.get(getPlayerStatsQuery);

  response.send(stats);
});

module.exports = app;
