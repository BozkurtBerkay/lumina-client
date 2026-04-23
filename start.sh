#!/bin/sh
# Railway provides $PORT at runtime — inject it into Nginx config
sed -i "s/RAILWAY_PORT/${PORT:-80}/g" /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
