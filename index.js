import express from "express";
import bodyParser from "body-parser";
import pg from 'pg';
// import {} from 'dotenv/config';
const app = express();

const port = process.env.PORT || 3000;


const { Pool } = pg;
const db = new Pool({
  connectionString: "postgres://default:6GJfwSCp8LHr@ep-dawn-bar-77210014-pooler.us-east-1.postgres.vercel-storage.com:5432/verceldb"+ "?sslmode=require",
})

db.connect(err=>{
  if (err) {
    console.log(err);
  } else {
    console.log("connected");
  }
})


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");


let currentUserId = 1;

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

let users =[]
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  let user=  users.find((user) => user.id == currentUserId) ;
  if (!user && users.length !== 0) {
    user  = users[0]
  } 
  return user
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  if (users.length === 0) {
    res.render("new.ejs");
  }
  
  else{
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      username: currentUser.name,
      color: currentUser.color,
    });
  }
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];  
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1 || '%';",
      [input.toLowerCase()]
    );   
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      if (req.body.addbtn==='true'){
        await db.query(
          "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
      } 
      else {
        await db.query(
          "DELETE FROM visited_countries WHERE country_code = $1 AND user_id = $2",
          [countryCode, currentUserId]

        );
      }
      res.redirect("/");
    } catch (err) {      res.redirect("/");    }
  } catch (err) {res.redirect("/");  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {

  let name = req.body.name;
  let color = req.body.color;
  if (!color) {
    color = "red";
  }
  let result ; 
  if (req.body.addbtn){
    let allusers = await db.query("SELECT * FROM users");
    let users = allusers.rows;
    let userExist = users.find((user) => user.name == name)
    if (!userExist){
      result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    );
    currentUserId = result.rows[0].id;
    }
  }
  if (req.body.updatebtn){
    let allusers = await db.query("SELECT * FROM users");
    let users = allusers.rows;
    let userExist = users.find((user) => user.name == name)
    if (!userExist){
      result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    );
      }
    else{
    result = await db.query(
      "UPDATE users SET name=$1 , color=$2 WHERE name=$1 RETURNING *; ",
      [name, color]
    );
    currentUserId = result.rows[0].id;
  }
  }
  if (req.body.deletebtn){
    result =  await db.query(
      "DELETE FROM users WHERE name = $1;",
      [name]
    );
  }
  
  

  res.redirect("/");
});

app.get("*", async (req, res) => {
  res.redirect('/')
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
