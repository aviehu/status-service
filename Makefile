rc:
	./docker/build_dev.sh

prod:
	./docker/build_prod.sh

tag:
	./docker/tag_version.sh ${tag}