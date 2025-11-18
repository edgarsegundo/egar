# egar

## Development

npm run watch:css

## Production

npm run build:css

## How to use `ecosystem.config.cjs`

```json
module.exports = {
  apps: [
    {
      name: "egar",
      script: "server.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

> PM2 will print a command (with sudo).
> # Something like:
> sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u yourUser --hp /home/yourUser
