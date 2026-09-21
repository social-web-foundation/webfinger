function listen (servers, server, port, callback) {
  servers.push(server)
  server.once('error', callback)
  server.listen(port, function () {
    server.removeListener('error', callback)
    callback()
  })
}

function closeServers (servers) {
  return Promise.all(servers.map(function (server) {
    return new Promise(function (resolve, reject) {
      if (!server.listening) {
        resolve()
        return
      }
      server.close(function (err) {
        if (err) reject(err)
        else resolve()
      })
      server.closeAllConnections()
    })
  }))
}

module.exports = { listen, closeServers }
