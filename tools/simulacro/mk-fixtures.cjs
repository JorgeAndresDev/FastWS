const fs = require("node:fs")
const path = require("node:path")
const XLSX = require("C:/JDEV/FastWS/node_modules/xlsx")

const dir = path.join(__dirname, "fixtures")
fs.mkdirSync(dir, { recursive: true })

const csv = (name, text) => fs.writeFileSync(path.join(dir, name), text.replace(/^\s+/, "").trimEnd() + "\n", "utf8")

csv("ok.csv", `
Codigo,Nombre,Telefono,Ciudad,Zona,Tipo
NA-1001,Ana Garcia,3001110001,Manizales,Norte,
NA-1002,Luis Perez,3012220002,Dosquebradas,Centro,si
NA-1003,Sara Mora,3023330003,Armenia,Sur,
NA-1004,Diego Rios,3104440004,Manizales,Centro,
NA-BAD,Mal Telefono,5005550005,Manizales,Norte,`)

csv("reimporta.csv", `
Codigo,Nombre,Telefono,Ciudad,Zona
NA-1001,Ana Garcia,3001110001,Manizales,Norte
NA-1002,Luis Perez,3012220002,Dosquebradas,Centro
NA-1003,Sara Mora,3023330003,Armenia,Sur
NA-1004,Diego Rios,3104440004,Manizales,Centro`)

csv("doble_codigo.csv", `
Codigo,Nombre,Telefono
DD-5001,Primer Duplicado,3015551001
DD-5001,Segundo Duplicado,3015552002`)

csv("fijo_movil.csv", `
Codigo,Nombre,Telefono,Telefonos,Telefono2
FM-6001,Fijo antes movil,6041234567,3112223344,3223334455`)

csv("sin_columnas.csv", `
Foo,Bar
x,y`)

csv("extras.csv", `
Codigo,Nombre,Telefono,Ciudad,Zona,Pedido,En ruta?,Telefonos,Telefono2
EA-7001,Cliente Enriquecido,3117770001,Manizales,Norte,CANCELADO,si,3228880002,3139990003`)

csv("zz-reimport.csv", `
Codigo,Nombre,Telefono
ZZ-9001,ZZ Nombre,3119990001
VV-1001,Nuevo Valido,3002220002`)

const madre = XLSX.utils.book_new()
const eta = [
  ["Codigo", "Nombre", "Telefono", "Ciudad", "Zona"],
  ["EX-1001", "Eta Uno", "3011001001", "Pereira", "Centro"],
  ["EX-1002", "Eta Dos", "3022002002", "Cali", "Sur"],
  ["ZZ-9001", "ZZ Zombie", "3119990001", "Manizales", "Norte"],
]
const cancelados = [
  ["Codigo", "Nombre", "Telefono", "MOTIVO", "En ruta?"],
  ["ZZ-9001", "ZZ Zombie", "3119990001", "Baja por cierre", "no"],
]
const bases = [
  ["Codigo", "Nombre", "Telefono", "Telefonos"],
  ["ZZ-9001", "ZZ Zombie", "3119990001", "3131112222,3143334444"],
]
const aos = (rows) => XLSX.utils.aoa_to_sheet(rows)
XLSX.utils.book_append_sheet(madre, aos(eta), "ETA")
XLSX.utils.book_append_sheet(madre, aos(cancelados), "CANCELADOS")
XLSX.utils.book_append_sheet(madre, aos(bases), "BASES")
XLSX.writeFile(madre, path.join(dir, "madre.xlsx"))

console.log("fixtures:", fs.readdirSync(dir).join(", "))