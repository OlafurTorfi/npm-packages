#!/bin/sh

echo Executing docker command "$@"
echo "My env is "
env
if [ "$1" = "pretest" ]; then
	echo Pre test successful
	exit 0
elif [ "$1" = "posttest" ]; then
	echo Post test failed
	exit 2
else
	exec "$@"
fi