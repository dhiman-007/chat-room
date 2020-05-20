const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words') //to checkout for profanity
const { generateMessage, generateLocationMessage } = require('./utils/messages') //destructuring
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users') //destructuring of users.js functions

const app = express()  // to configure app using express
const server = http.createServer(app)
const io = socketio(server) // to configure server with socket.io

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')  //for static files

app.use(express.static(publicDirectoryPath)) //set up for html files in public directory

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    //1
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'No more corona feeds, Welcome :) '))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })


    //2
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        // to get the user from its socket ID
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        // this will emit message to coresponding room 
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })


    //3
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })


    //4
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin' , `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
    
        }
    })
})


//5
server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})