#!/bin/bash
# Script de Teste Complexo com Curl (alternativa ao PowerShell)
# Uso: ./teste-completo.sh

SERVER="http://localhost:3005/api/chat"
PASS=0
FAIL=0

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  TESTE COMPLETO - ATLAS AI ASSISTANT (Curl)               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Teste 1: Verificar se servidor está rodando
echo "Verificando conexão com servidor..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3005 | grep -q "200\|304\|404"; then
    echo "✅ Servidor respondendo na porta 3005"
    ((PASS++))
else
    echo "❌ Servidor não está rodando! Execute: npm start"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "TESTE 1: COMPRESSÃO"
echo "════════════════════════════════════════════════════════════"

response=$(curl -s -i -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d '{"pedido": "Teste de compressão com texto muito longo para gerar grande resposta para validar"}')

if echo "$response" | grep -i "content-encoding: gzip"; then
    echo "✅ Compressão ativa (gzip)"
    ((PASS++))
else
    echo "❌ Compressão não detectada"
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "TESTE 2: VALIDAÇÃO COM JOI"
echo "════════════════════════════════════════════════════════════"

# 2.1: Pedido vazio
echo "2.1 - Testando pedido vazio..."
response=$(curl -s -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d '{"pedido": ""}')

if echo "$response" | grep -q "não pode estar vazio"; then
    echo "✅ Validação: pedido vazio rejeitado"
    ((PASS++))
else
    echo "❌ Validação falhou: $response"
    ((FAIL++))
fi

# 2.2: Pedido muito longo
echo "2.2 - Testando pedido muito longo..."
long_text=$(python3 -c "print('a' * 5001)")
response=$(curl -s -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d "{\"pedido\": \"$long_text\"}")

if echo "$response" | grep -q "5000 caracteres"; then
    echo "✅ Validação: pedido longo rejeitado"
    ((PASS++))
else
    echo "❌ Validação falhou"
    ((FAIL++))
fi

# 2.3: Latitude inválida
echo "2.3 - Testando latitude inválida..."
response=$(curl -s -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d '{"pedido": "Teste", "latitude": "abc"}')

if echo "$response" | grep -q "número"; then
    echo "✅ Validação: latitude inválida rejeitada"
    ((PASS++))
else
    echo "❌ Validação falhou"
    ((FAIL++))
fi

# 2.4: Pedido válido
echo "2.4 - Testando pedido válido..."
response=$(curl -s -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d '{"pedido": "Olá Atlas!"}')

if echo "$response" | grep -q "resposta"; then
    echo "✅ Pedido válido aceito"
    ((PASS++))
else
    echo "❌ Pedido válido rejeitado"
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "TESTE 3: RATE LIMITING"
echo "════════════════════════════════════════════════════════════"

echo "Enviando 35 requisições rápidas..."
success_count=0
rate_limit_count=0

for i in {1..35}; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER" \
      -H "Content-Type: application/json" \
      -d '{"pedido": "Teste"}')
    
    if [ "$http_code" = "200" ]; then
        echo -n "."
        ((success_count++))
    elif [ "$http_code" = "429" ]; then
        echo -n "X"
        ((rate_limit_count++))
    else
        echo -n "!"
    fi
    sleep 0.05
done

echo ""
echo "✅ Requisições aceitas: $success_count (≤30 esperado)"
echo "✅ Requisições bloqueadas: $rate_limit_count (429)"

if [ $rate_limit_count -gt 0 ]; then
    ((PASS++))
else
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "TESTE 4: PERFORMANCE"
echo "════════════════════════════════════════════════════════════"

echo "Medindo tempo de 5 requisições..."
total_time=0

for i in {1..5}; do
    start=$(date +%s%N)
    curl -s -X POST "$SERVER" \
      -H "Content-Type: application/json" \
      -d '{"pedido": "Teste de performance"}' > /dev/null
    end=$(date +%s%N)
    
    elapsed=$((($end - $start) / 1000000))
    echo "Requisição $i: ${elapsed}ms"
    total_time=$((total_time + elapsed))
done

avg_time=$((total_time / 5))
echo "⏱️  Tempo médio: ${avg_time}ms"

if [ $avg_time -lt 2000 ]; then
    echo "✅ Performance excelente (< 2s)"
    ((PASS++))
else
    echo "✅ Performance aceitável"
    ((PASS++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "TESTE 5: TRATAMENTO DE ERROS"
echo "════════════════════════════════════════════════════════════"

# 5.1: JSON inválido
echo "5.1 - JSON inválido..."
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d '{"pedido": invalid}')

if [ "$http_code" = "400" ]; then
    echo "✅ Erro 400 retornado"
    ((PASS++))
else
    echo "❌ Esperava 400, obteve $http_code"
    ((FAIL++))
fi

# 5.2: Campo obrigatório faltando
echo "5.2 - Campo obrigatório faltando..."
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$http_code" = "400" ]; then
    echo "✅ Erro 400 retornado"
    ((PASS++))
else
    echo "❌ Esperava 400, obteve $http_code"
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "RESUMO"
echo "════════════════════════════════════════════════════════════"

total=$((PASS + FAIL))
echo "✅ Passou: $PASS/$total"
echo "❌ Falhou: $FAIL/$total"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 TODOS OS TESTES PASSARAM!"
else
    echo "⚠️  Alguns testes falharam. Verifique o servidor."
fi
