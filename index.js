const express = require('express'),
	http = require('http'),
	path = require('path'),
	socketio = require('socket.io')

function Log(msg) {
	const now = new Date()
	console.log(`[${now.toLocaleString()}] ${msg}`)
}

const app = express(),
	server = http.createServer(app),
	io = socketio(server)

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'))
})

let userNum = 0;
const users = [];

io.on('connection', (socket) => {
	Log(socket.id + '建立连接');
	let userAdded = false

	// 连接断开，用户离开
	socket.on('disconnect', () => {
		if (userAdded) {
			userNum--

			// 用户离开，删除数据，不做保存
			users.splice(socket.userid, 1);

			io.emit('user leave', {
				username: socket.username,
				userid: socket.id,
				userNum
			})
		}

		Log(socket.id + '连接断开')
	})

	// 自定义事件
	// 新消息
	socket.on('new message', (data) => {
		if (data.toUserId) {
			socket.to(data.toUserId).emit('new message', {
				username: socket.username,
				userid: socket.id,
				message: data.message,
				isPerson: true
			})
		} else {
			socket.broadcast.emit('new message', {
				username: socket.username,
				userid: socket.id,
				message: data.message
			})
		}
	})
	// 用户加入
	socket.on('user join', (data) => {
		if (userAdded) return

		const len = users.length;
		users.push({
			userid: socket.id,
			username: data.username
		});
		userAdded = true;
		userNum++
		socket.username = data.username
		socket.userid = len; // 用户数据的数组下标

		io.emit('user join', {
			username: data.username,
			userid: socket.id,
			id: len,
			userNum
		})
	});
	socket.on('get userlist', () => {
		// 去掉自己的数据
		const arr = users.concat([])
		arr.splice(socket.userid, 1)
		socket.emit('update userlist', arr)
	});
	// 用户正在输入
	socket.on('typing', () => {
		socket.broadcast.emit('typing', {
			username: socket.username
		})
	})
	// 用户停止输入
	socket.on('stop typing', () => {
		socket.broadcast.emit('typing', {
			username: socket.username
		})
	})

})

server.listen(3000, '127.0.0.1', () => {
	console.log('服务器端口：3000');
})
