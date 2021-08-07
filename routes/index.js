const express = require('express')
router = express.Router();
const db= require('../models/db');
//const { query } = require('express');

//todos los tickets
router.get('/', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .find()
        .toArray(function (err, items) {
            res.send(items);
        });
})


//tickets con desperfectos
router.get('/tickets-desperfectos', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([{ $match: { motivo:{ $eq: "desperfecto" }}}])
        .toArray(function (err, items) {
            res.send(items);
        });
})

// tickets resueltos por desperfecto
router.get('/tickets-desperfectos-cantidad', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$motivo" },
            {
                $match: {
                    "motivo":"desperfecto"  ,'estado.informe.estado': true }   
            },
            { $group: { _id: "$cliente.nombre",
            resulto: 
            {$sum:
                { $cond: [ {$eq:["$estado.informe.estado", true]}, 1, 0 ] }  } 
           }}
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})
//cada cuantos dias hay desperfectos
router.get('/tickets-desperfectos-cada-cuanto', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets").aggregate([
        { $match: { motivo: "desperfecto" } },
        { $project: { _id: 0, fecha: 1 } },
        { $group: { _id: "$fecha", cantidad: { $sum: 1 } } }

    ]).toArray((err, result) => {
        if (err) return console.log(err)
        console.log(result[0].cantidad)
        let diaTotal=0;
        let dia;
        result.forEach( fecha=> {
            dia= fecha._id.split('-')[2];
            diaTotal += parseInt(dia);
        });
        res.send({ data: 'Suceden cada: '+ diaTotal +' dias aprox' });
   
    });
})
//zona de tickets desperfecto
router.get('/zona-desperfectos', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $match: { motivo: "desperfecto" } },
            
		{
			$project: {descripcion: 1, zona : "$cliente.direccion.localidad.nombre"}
		},
            {
                $group: {
                    _id:"$zona",
                    descripciones: { $push: "$descripcion" }
                },
            },
            { $sort: { "_id": 1 } }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//zona del centro más concurrido
router.get('/zona-centros', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $unwind: "$estado"
            },
            {
                $project: {"estado.centro.direccion.localidad.nombre": 1, zona: "$estado.centro.direccion.localidad.nombre"}
            },
            {
                $group: {_id:"$zona", VecesConcurridas: {$sum: 1}}
            },
            {
                $sort: {_id: -1}
            },
            {
                $limit: 1
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//zona con mas clientes
router.get('/zona-clientes', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $unwind: "$cliente"
            },
            {
                $project: {"cliente.direccion.localidad.nombre": 1, zona: "$cliente.direccion.localidad.nombre"}
            },
            {
                $group: {_id:"$zona", cantClientes: {$sum: 1}}
            },
            {
                $sort: {_id: 1}
            },
            {
                $limit: 1
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})
//empleado con mayor tickes asignados
router.get('/empleado-mayor-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$estado" },
            { $project: { "estado.empleado": 1 } },
            {
                $group: {
                    _id: "$estado.empleado.id",
                    empleado: { "$first": "$estado.empleado.nombre" },
                    asignaciones: { $sum: 1 }
                }
            },
            { $sort: { asignaciones: -1 } },
            { $limit: 1 }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//empleado con mayor tickets sin resolver
router.get('/empleado-mayor-tickets-sin-resolver', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$estado" },
            {
                $match: {
                    "estado.informe.estado": { $nin: [true] }
                }
            },
            {
                $project: {
                    _id: '$estado.empleado.nombre',

                }
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//empleado con tickets
router.get('/empleado-con-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $lookup: {
                    from: "tickets",
                    as: "esCliente",
                    localField: "estado.empleado.nombre",
                    foreignField: "cliente.nombre",
                   
                }
            },
            { $sort: { "esCliente.cliente.nombre": -1} },
            { $limit: 1 },
            { $project: { _id: "$esCliente.cliente.nombre"} },
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//cliente con mas tickets
router.get('/cliente-con-mayor-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $project: {cliente: "$cliente.nombre"}
            },
            {
                $group: {_id : "$cliente", tickets : {$sum : 1}}
            },
            {
                $sort: {'tickets': -1}
            },
            {
                $limit: 1
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//cliente ubicados a menos de 200km de un centros 
router.get('/centros-clientes', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets").find().forEach((ticket) => 
    {
        dbTickets.collection("centros").aggregate([
            {
                $geoNear: {
                    near: ticket.cliente.direccion.geometry,
                    distanceField: "dist.calculated",
                    maxDistance: 200000
                }
            },
            {
                $group: {
                    _id:ticket.cliente.nombre,
                    cantidadCentros: { $sum: 1 }
                }
            }
    
    ]).toArray((err, result) => {
        if (err) return console.log(err)
        res.send(result)
    })

})
})

module.exports = router;