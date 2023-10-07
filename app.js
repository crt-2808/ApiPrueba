const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql");
const cors= require("cors");
app.get("/", (req, res) => {
  //res.send(" Hello world!")
  res.sendFile(path.join(__dirname + "/index.html"));
});

const db = mysql.createConnection({
  host: "146.148.100.168", // Cambia esto por la dirección de tu servidor MySQL
  user: "cbramos",
  password: "52Gy8fzZLyR4",
  database: "sarym",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos: " + err.message);
  } else {
    console.log("Conexión exitosa a la base de datos");
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors())
app.use(express.static('public'));

app.post("/guardar_datos", (req, res) => {  
  const { NombreCompleto, Telefono, FechaAsignacion, Descripcion, Tipo="Llamada", FechaConclusion=FechaAsignacion,Documentos='src', IDColaborador=1, Direccion_Calle="CallePrueba"  } = req.body;
  // Inserta los datos en la base de datos
  const sql =
    "INSERT INTO Planificador (NombreCompleto, Telefono, FechaAsignacion, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador, Direccion_Calle) VALUES (?, ?, ?, ?, ?,?,?,?,?)";
  const values = [NombreCompleto, Telefono, FechaAsignacion, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador,Direccion_Calle];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(
        "Error al insertar datos en la base de datos: " + err.message
      );
      res.status(500).send("Error al guardar los datos en la base de datos");
    } else {
      console.log("Datos guardados correctamente");
      res.status(200).send("Datos guardados correctamente");
    }
  });
});

app.listen(3005, () => {
  console.log("server is running on port ", 3005);
});
