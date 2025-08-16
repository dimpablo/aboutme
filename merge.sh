#!/bin/bash

# merge-cursor.sh — Автоматический merge ветки cursor/* в main с -X theirs

set -e  # Останавливаем скрипт при любой ошибке

echo "🔹 Обновляем список веток с origin..."
git fetch origin

echo "🔹 Переключаемся на main"
git checkout main

echo "🔹 Обновляем локальную main"
git pull origin main

echo "🔹 Ищем ветку cursor..."
# Убираем пробелы в начале и конце, ищем origin/cursor
CURSOR_BRANCH=$(git branch -r | grep 'origin/cursor/' | head -n 1 | xargs)

if [ -z "$CURSOR_BRANCH" ]; then
  echo "❌ Не найдено ни одной ветки вида origin/cursor/*"
  exit 1
fi

echo "🔹 Найдена ветка: $CURSOR_BRANCH"
echo "🔹 Выполняем merge с -X theirs..."

# Используем полное имя вида origin/...
git merge -X theirs "$CURSOR_BRANCH"

echo "✅ Merge успешно выполнен"

echo "🔹 Отправляем изменения в origin main"
git push origin main

echo "🎉 Ветка $CURSOR_BRANCH успешно слита в main (в пользу cursor)!"
