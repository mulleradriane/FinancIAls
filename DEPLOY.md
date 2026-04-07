# FinancIAls — Deploy na EC2

Guia de disaster recovery: do zero ao HTTPS funcionando.

---

## Pré-requisitos

- Conta AWS com permissão para criar EC2
- Token do DuckDNS e domínio já registrado (`ronromia.duckdns.org`)
- Repositório do projeto no Git
- Chave `.pem` da EC2

---

## 1. Criar a EC2

- AMI: **Ubuntu 22.04 LTS**
- Tipo: `t3.micro` ou maior
- Security Group — inbound rules:

| Tipo       | Porta | Origem        |
|------------|-------|---------------|
| SSH        | 22    | Seu IP `/32`  |
| HTTP       | 80    | `0.0.0.0/0`   |
| HTTPS      | 443   | `0.0.0.0/0`   |

> **Não abrir porta 8000 ou 3000 publicamente.**

---

## 2. Acessar a instância

```bash
ssh -i sua-chave.pem ubuntu@SEU_IP_PUBLICO
```

---

## 3. Instalar dependências

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
# Reconectar SSH após isso para aplicar o grupo
```

---

## 4. Atualizar DuckDNS

```bash
curl "https://www.duckdns.org/update?domains=ronromia&token=SEU_TOKEN&ip=SEU_IP_PUBLICO"
```

Verificar propagação:

```bash
dig ronromia.duckdns.org +short
# Deve retornar o IP da EC2
```

---

## 5. Clonar o projeto

```bash
git clone SEU_REPO_URL ~/FinancIAls
cd ~/FinancIAls
```

Criar o `.env` da aplicação:

```bash
cp .env.example .env
# Editar com as variáveis necessárias
nano .env
```

---

## 6. Gerar certificado SSL

A porta 80 precisa estar livre (sem containers rodando):

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d ronromia.duckdns.org
```

Certificados ficam em `/etc/letsencrypt/live/ronromia.duckdns.org/`.

---

## 7. Build do frontend

```bash
sudo apt install -y nodejs npm
cd ~/FinancIAls/frontend
echo "VITE_API_URL=https://ronromia.duckdns.org/api" > .env.production
npm install
npm run build
cd ..
```

---

## 8. Subir a aplicação

```bash
docker-compose up -d --build
docker ps  # Todos os containers devem estar Up
```

---

## 9. Validar

```bash
# Redirect HTTP → HTTPS
curl -I http://ronromia.duckdns.org

# HTTPS com TLS
curl -I https://ronromia.duckdns.org

# API respondendo
curl https://ronromia.duckdns.org/api/
```

---

## Renovação automática do certificado

O certbot já configura um timer systemd automaticamente. Para verificar:

```bash
sudo systemctl status certbot.timer
```

Se preferir via cron:

```bash
sudo crontab -e
# Adicionar:
0 3 * * * certbot renew --quiet --pre-hook "docker-compose -f /home/ubuntu/FinancIAls/docker-compose.yml stop nginx" --post-hook "docker-compose -f /home/ubuntu/FinancIAls/docker-compose.yml start nginx"
```

> O hook para o nginx antes da renovação (libera porta 80) e sobe novamente depois.

---

## Estrutura esperada

```
FinancIAls/
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── .env
├── app/
└── frontend/
    └── dist/        ← gerado pelo npm run build
```

---

## docker-compose.yml de referência

```yaml
version: "3.8"

services:
  app:
    build: .
    expose:
      - "8000"
    env_file:
      - .env
    depends_on:
      - db
    restart: always

  db:
    image: postgres:14
    restart: always
    environment:
      POSTGRES_USER: financials
      POSTGRES_PASSWORD: financials
      POSTGRES_DB: financials_db
    volumes:
      - pgdata:/var/lib/postgresql/data

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - app
    restart: always

volumes:
  pgdata:
```

---

## nginx.conf de referência

```nginx
server {
    listen 80;
    server_name ronromia.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ronromia.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/ronromia.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ronromia.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://app:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Troubleshooting rápido

| Sintoma | Causa provável | Ação |
|---|---|---|
| nginx em Restarting | `nginx.conf` com `server {}` montado em `/etc/nginx/nginx.conf` | Montar em `conf.d/default.conf` |
| `curl` trava na porta 443 | Security Group sem regra HTTPS | Adicionar inbound 443 |
| Frontend mostra só JSON da API | `dist/` não montado no nginx | Checar volume e rebuild do frontend |
| Certbot falha | Porta 80 ocupada pelo nginx | Parar containers antes do certbot |
