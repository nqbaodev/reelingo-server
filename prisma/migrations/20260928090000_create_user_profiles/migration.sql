-- Move editable profile data out of the account/identity table.
BEGIN;

CREATE TABLE "user_profiles" (
    "user_id" INTEGER NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "avatar_url" VARCHAR(2048),
    "country_code" VARCHAR(3),
    "phone_number" VARCHAR(15),
    "birth_date" DATE,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_profiles_country_code_format_check"
        CHECK ("country_code" IS NULL OR "country_code" ~ '^[1-9][0-9]{0,2}$'),
    CONSTRAINT "user_profiles_phone_number_format_check"
        CHECK ("phone_number" IS NULL OR "phone_number" ~ '^[0-9]{4,15}$')
);

INSERT INTO "user_profiles" ("user_id", "display_name", "avatar_url", "updated_at")
SELECT "id", "name", "avatar_url", "updated_at"
FROM "users";

ALTER TABLE "user_profiles"
ADD CONSTRAINT "user_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users"
DROP COLUMN "name",
DROP COLUMN "avatar_url";

COMMIT;
