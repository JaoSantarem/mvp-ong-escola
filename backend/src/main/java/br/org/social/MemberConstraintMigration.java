package br.org.social;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
class MemberConstraintMigration implements ApplicationRunner {
    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(MemberConstraintMigration.class);

    private final JdbcTemplate jdbc;

    MemberConstraintMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Older versions accidentally created unique indexes on hash and role.
        // Keep the intended unique indexes on email and login, and remove only the
        // obsolete constraints that prevent multiple users from sharing a role.
        List<String> obsoleteIndexes = jdbc.queryForList("""
                SELECT DISTINCT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'member'
                  AND NON_UNIQUE = 0
                  AND COLUMN_NAME IN ('hash', 'role')
                  AND INDEX_NAME <> 'PRIMARY'
                """, String.class);

        for (String index : obsoleteIndexes) {
            String safeIndex = index.replace("`", "``");
            jdbc.execute("ALTER TABLE `member` DROP INDEX `" + safeIndex + "`");
            log.warn("Removed obsolete unique index {} from member table", index);
        }
    }
}
