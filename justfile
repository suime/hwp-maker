set windows-shell := ["nu", "-c"]

# Justfile for hwp-maker
default:
    @just --list

# 린트 하기
lint:
    @npm run lint --fix

# 개발 서버 실행하기
dev:
    @npm run dev

# 최신 rhwp-studio/WASM 빌드 산출물로 public/rhwp-studio 업데이트하기
update-rhwp ref="main":
    @let repo = "https://github.com/edwardkim/rhwp.git";  \
        let work = ($env.TEMP | path join "hwp-maker-rhwp-upstream"); \
        if not ($work | path exists) { git clone $repo $work } else { git -C $work fetch --tags --prune origin }; \
        let work = ($env.TEMP | path join "hwp-maker-rhwp-upstream"); let ref = "{{ ref }}"; git -C $work checkout --force $ref;  \
        if $ref == "main" { git -C $work reset --hard origin/main }; git -C $work clean -fdx let work = ($env.TEMP | path join "hwp-maker-rhwp-upstream"); let env_file = ($work | path join ".env.docker"); \
        if not ((which wasm-pack | is-empty)) { do --env { cd $work; wasm-pack build --target web --release } } else { if not ($env_file | path exists) { cp ($work | path join ".env.docker.example") $env_file };  \
        if not ((which docker | is-empty)) { docker compose --project-directory $work --env-file $env_file run --rm wasm } else if not ((which docker-compose | is-empty)) { docker-compose  --project-directory $work --env-file $env_file run --rm wasm } else { error make { msg: "wasm-pack 또는 Docker Compose가 필요합니다." } } }; \
        let work = ($env.TEMP | path join "hwp-maker-rhwp-upstream"); let pkg = ($work | path join "pkg"); let wasm = ($pkg | path join "rhwp_bg.wasm"); let glue = ($pkg | path join "rhwp.js"); \
        if not ($wasm | path exists) { error make { msg: "WASM 빌드 산출물이 없습니다: pkg/rhwp_bg.wasm" } }; \
        if not ($glue | path exists) { error make { msg: "WASM JS glue 산출물이 없습니다: pkg/rhwp.js" } }; let studio_public = ($work | path join "rhwp-studio" "public"); cp $wasm $studio_public; \
        cp $glue $studio_public; let work = ($env.TEMP | path join "hwp-maker-rhwp-upstream"); let studio = ($work | path join "rhwp-studio"); npm --prefix $studio install; npm --prefix $studio run build -- --base=/rhwp-studio/; \
        let work = ($env.TEMP | path join "hwp-maker-rhwp-upstream"); let target = "public/rhwp-studio"; let backup = ("public/rhwp-studio.backup-" + (date now | format date "%Y%m%d-%H%M%S")); if ($target | path exists) { mv $target $backup }; cp -r ($work | path join "rhwp-studio" "dist") $target;\
        print "rhwp-studio 업데이트 완료: public/rhwp-studio"
