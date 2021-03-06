const WebSocketClient = require('websocket').client;
const colors = require('colors/safe');
const baseMiner = require('./baseMiner');

module.exports = class cpuminerOpt extends baseMiner {

  constructor(binPath, minerString, options) {
    super(binPath, minerString, options);
  }

  async updateStats() {
    const data = await new Promise((resolve) => {
      const client = new WebSocketClient();

      client.on('connectFailed', (error) => {
        this.logger.error(`Connect failed for cpuminer-opt on port ${this.port}`);
        this.logger.debug(error.toString());
        resolve({});
      });

      client.on('connect', (connection) => {
        connection.on('error', (error) => {
          this.logger.error(`Connection Error for cpuminer-opt on port ${this.port}`);
          this.logger.debug(error.toString());
          resolve({});
        });
        connection.on('message', (message) => {
          if (message.type !== 'utf8') {
            return resolve({});
          }
          let properties = message.utf8Data.split('|');
          properties = properties[0].split(';');
          let obj = {};
          properties.forEach((property) => {
            let tup = property.split('=');
            obj[tup[0]] = tup[1];
          });
          const result = {
            accepted: parseFloat(obj.ACC),
            acceptedPerMinute: parseFloat(obj.ACCMN),
            algorithm: obj.ALGO,
            difficulty: parseFloat(obj.DIFF),
            hashrate: parseFloat(obj.KHS),
            miner: `${obj.NAME} ${obj.VER}`,
            rejected: parseFloat(obj.REJ),
            uptime: obj.UPTIME,
            cpus: parseFloat(obj.CPUS),
            temperature: parseFloat(obj.TEMP),
          };

          resolve(result);
        });
      });

      client.connect(`ws://127.0.0.1:${this.port}/summary`, 'text');
    });
    super.updateStats();
    this.stats.data = data;
  }

  async handleMinerCrash() {
    if (this.running) {
      this.logger.warn(`${colors.cyan('[cpuminer-opt]')} ${colors.red('miner terminated, restarting...')}`);
      await super.handleMinerCrash();
    }
  }

  parseApiPort(port) {
    return ` -b 127.0.0.1:${port}`;
  }

  parsePoolToMinerString(pool, groupName, rigName) {
    let worker = pool.worker;
    // only append dot if no dot already present and at least one string is getting appended
    if ((pool.appendRigName || pool.appendGroupName) && worker.indexOf('.') === -1) {
      worker += '.';
    }
    worker += (pool.appendRigName ? rigName : '');
    worker += (pool.appendGroupName ? groupName : '');
    return ` -o ${pool.url} -u ${worker} -p ${pool.pass}`;
  }
};