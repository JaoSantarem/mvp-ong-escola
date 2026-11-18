package br.org.social;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import br.org.social.model.*;
import br.org.social.repository.*;
import br.org.social.security.TokenSecurity;
import com.fasterxml.jackson.databind.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
        "spring.datasource.url=jdbc:h2:mem:feature-tests;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "app.demo.enabled=false",
        "springdoc.api-docs.enabled=false",
        "springdoc.swagger-ui.enabled=false",
    }
)
@AutoConfigureMockMvc
class AreaAndPhotosTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    OrgRepository orgs;

    @Autowired
    MemberRepository members;

    @Autowired
    ApiTokenRepository tokens;

    @Autowired
    ProjectRepository projects;

    @Autowired
    StudentRepository students;

    @Autowired
    InstructorRepository instructors;

    @Autowired
    PhotoAssetRepository photos;

    static final Path uploadRoot = tempDirectory();

    static Path tempDirectory() {
        try {
            return Files.createTempDirectory("ong-feature-photos-");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("app.upload-dir", () -> uploadRoot.toString());
        registry.add("logging.file.name", () -> uploadRoot.resolve("test.log").toString());
    }

    @AfterAll
    static void cleanup() throws IOException {
        try (var paths = Files.walk(uploadRoot)) {
            for (Path p : paths.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(p);
        }
    }

    record Actor(Member member, Org org, String token) {}

    Actor actor(String role, boolean day, boolean management, Org existing) {
        String key = UUID.randomUUID().toString();
        Org org = existing == null ? orgs.save(new Org("OrganizaÃ§Ã£o de teste", "ONG")) : existing;
        Member member = new Member(org, key, key + "@example.invalid", null, role);
        member.setName("Membro teste");
        member.setDayToDayAccess(day);
        member.setManagementAccess(management);
        member = members.save(member);
        String raw = TokenSecurity.newToken();
        tokens.save(new ApiToken(member, TokenSecurity.hash(raw), Instant.now().plusSeconds(3600)));
        return new Actor(member, org, raw);
    }

    Project project(Actor a) {
        return projects.save(
            new Project(a.org(), "Projeto de teste", "Fonte de teste", new BigDecimal("1000.00"))
        );
    }

    Student student(Actor a) {
        return students.save(
            new Student(a.org(), "Participante teste", LocalDate.of(2000, 1, 1), "", true)
        );
    }

    byte[] png() throws IOException {
        var image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    JsonNode upload(
        Actor actor,
        String type,
        Long owner,
        String date,
        byte[] bytes
    ) throws Exception {
        String response = mvc
            .perform(
                multipart("/api/photos/" + type + "/" + owner)
                    .file(new MockMultipartFile("files", "foto.png", "image/png", bytes))
                    .param("photoDate", date)
                    .param("caption", "Registro de teste")
                    .header("Authorization", "Bearer " + actor.token())
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        return json.readTree(response);
    }

    @Test
    void areasAreEnforcedAndRevocationAppliesToExistingTokens() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Actor member = actor("INSTRUCTOR", true, false, admin.org());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + member.token()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dayToDayAccess").value(true))
            .andExpect(jsonPath("$.managementAccess").value(false));
        mvc.perform(
            get("/api/students").header("Authorization", "Bearer " + member.token())
        ).andExpect(status().isOk());
        mvc.perform(
            get("/api/ledger").header("Authorization", "Bearer " + member.token())
        ).andExpect(status().isForbidden());
        mvc.perform(
            put("/api/users/" + member.member().getId() + "/areas")
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dayToDayAccess\":false,\"managementAccess\":true}")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.managementAccess").value(true));
        mvc.perform(
            get("/api/students").header("Authorization", "Bearer " + member.token())
        ).andExpect(status().isForbidden());
        mvc.perform(
            get("/api/ledger").header("Authorization", "Bearer " + member.token())
        ).andExpect(status().isOk());
        mvc.perform(
            put("/api/users/" + admin.member().getId() + "/areas")
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dayToDayAccess\":false,\"managementAccess\":true}")
        ).andExpect(status().isBadRequest());
        mvc.perform(
            put("/api/users/" + member.member().getId() + "/areas")
                .header("Authorization", "Bearer " + member.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dayToDayAccess\":true,\"managementAccess\":true}")
        ).andExpect(status().isForbidden());
        Actor stranger = actor("ADMIN", true, true, null);
        mvc.perform(
            put("/api/users/" + member.member().getId() + "/areas")
                .header("Authorization", "Bearer " + stranger.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dayToDayAccess\":true,\"managementAccess\":true}")
        ).andExpect(status().isNotFound());
    }

    @Test
    void newMembersStartWithDayAreaAndCanHaveNoAreas() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        String key = UUID.randomUUID().toString();
        String body = json.writeValueAsString(
            Map.of("name", "Novo membro", "login", key, "email", key + "@example.invalid")
        );
        JsonNode created = json.readTree(
            mvc
                .perform(
                    post("/api/users")
                        .header("Authorization", "Bearer " + admin.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dayToDayAccess").value(true))
                .andExpect(jsonPath("$.managementAccess").value(false))
                .andReturn()
                .getResponse()
                .getContentAsString()
        );
        mvc.perform(
            put("/api/users/" + created.get("id").asLong() + "/areas")
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dayToDayAccess\":false,\"managementAccess\":false}")
        ).andExpect(status().isOk());
        Actor none = actor("INSTRUCTOR", false, false, admin.org());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + none.token())).andExpect(
            status().isOk()
        );
        mvc.perform(
            get("/api/workshops").header("Authorization", "Bearer " + none.token())
        ).andExpect(status().isForbidden());
        mvc.perform(
            get("/api/projects").header("Authorization", "Bearer " + none.token())
        ).andExpect(status().isForbidden());
    }

    @Test
    void projectPhotosPersistAndFilterByInclusiveDates() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Project p = project(admin);
        byte[] bytes = png();
        JsonNode first = upload(admin, "PROJECT", p.getId(), "2026-11-10", bytes);
        upload(admin, "PROJECT", p.getId(), "2026-11-11", bytes);
        upload(admin, "PROJECT", p.getId(), "2026-11-12", bytes);
        mvc.perform(
            get("/api/photos/PROJECT/" + p.getId())
                .param("from", "2026-11-10")
                .param("until", "2026-11-11")
                .header("Authorization", "Bearer " + admin.token())
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(
            get("/api/photos/PROJECT/" + p.getId())
                .param("from", "2026-11-12")
                .param("until", "2026-11-10")
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isBadRequest());
        String url = first.get(0).get("url").asText();
        mvc.perform(get(url).header("Authorization", "Bearer " + admin.token()))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes(bytes));
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        Actor stranger = actor("ADMIN", true, true, null);
        mvc.perform(get(url).header("Authorization", "Bearer " + stranger.token())).andExpect(
            status().isNotFound()
        );
        mvc.perform(
            get("/api/photos/PROJECT/" + p.getId()).header(
                "Authorization",
                "Bearer " + stranger.token()
            )
        ).andExpect(status().isNotFound());
    }

    @Test
    void profilePhotosAndGalleryRespectAreaAndTenantBoundaries() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Student s = student(admin);
        JsonNode first = upload(admin, "STUDENT", s.getId(), "2026-11-10", png());
        JsonNode latest = upload(admin, "STUDENT", s.getId(), "2026-11-11", png());
        mvc.perform(
            get("/api/photos/avatars/STUDENT").header("Authorization", "Bearer " + admin.token())
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(latest.get(0).get("id").asInt()));
        Actor day = actor("INSTRUCTOR", true, false, admin.org());
        mvc.perform(
            get(first.get(0).get("url").asText()).header("Authorization", "Bearer " + day.token())
        ).andExpect(status().isOk());
        Project p = project(admin);
        JsonNode projectPhoto = upload(admin, "PROJECT", p.getId(), "2026-11-11", png());
        mvc.perform(
            get(projectPhoto.get(0).get("url").asText()).header(
                "Authorization",
                "Bearer " + day.token()
            )
        ).andExpect(status().isForbidden());
        mvc.perform(
            get("/api/photos/avatars/MEMBER").header("Authorization", "Bearer " + day.token())
        ).andExpect(status().isForbidden());
        Instructor instructor = instructors.save(
            new Instructor(admin.org(), "Instrutor", "Arte", "(11) 91234-5678")
        );
        upload(admin, "INSTRUCTOR", instructor.getId(), "2026-11-11", png());
        upload(admin, "MEMBER", day.member().getId(), "2026-11-11", png());
        mvc.perform(
            get("/api/photos/avatars/MEMBER").header("Authorization", "Bearer " + admin.token())
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(
            multipart("/api/photos/STUDENT/" + s.getId())
                .file(new MockMultipartFile("files", "foto.png", "image/png", png()))
                .header("Authorization", "Bearer " + day.token())
        ).andExpect(status().isForbidden());
        Actor stranger = actor("ADMIN", true, true, null);
        mvc.perform(
            multipart("/api/photos/STUDENT/" + s.getId())
                .file(new MockMultipartFile("files", "foto.png", "image/png", png()))
                .header("Authorization", "Bearer " + stranger.token())
        ).andExpect(status().isNotFound());
    }

    @Test
    void invalidImageBatchesAreRejectedBeforeAnyPhotoIsStored() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Project p = project(admin);
        long before = photos.count();
        mvc.perform(
            multipart("/api/photos/PROJECT/" + p.getId())
                .file(new MockMultipartFile("files", "ok.png", "image/png", png()))
                .file(
                    new MockMultipartFile(
                        "files",
                        "fake.png",
                        "image/png",
                        "not an image".getBytes()
                    )
                )
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isBadRequest());
        assertEquals(before, photos.count());
        Student student = student(admin);
        mvc.perform(
            multipart("/api/photos/STUDENT/" + student.getId())
                .file(new MockMultipartFile("files", "a.png", "image/png", png()))
                .file(new MockMultipartFile("files", "b.png", "image/png", png()))
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isBadRequest());
        mvc.perform(
            multipart("/api/photos/PROJECT/" + p.getId())
                .file(
                    new MockMultipartFile(
                        "files",
                        "large.png",
                        "image/png",
                        new byte[8 * 1024 * 1024 + 1]
                    )
                )
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isBadRequest());
        assertEquals(before, photos.count());
    }

    @Test
    void ledgerIncludesStableProjectIdsEvenWhenNamesAreEqual() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Project a = project(admin),
            b = project(admin);
        for (Project p : List.of(a, b)) {
            String body = json.writeValueAsString(
                Map.of(
                    "type",
                    "DONATION",
                    "description",
                    "Teste",
                    "amount",
                    25,
                    "receivedDate",
                    "2026-11-10",
                    "projectId",
                    p.getId()
                )
            );
            mvc.perform(
                post("/api/incomes")
                    .header("Authorization", "Bearer " + admin.token())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            ).andExpect(status().isOk());
        }
        JsonNode ledger = json.readTree(
            mvc
                .perform(get("/api/ledger").header("Authorization", "Bearer " + admin.token()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString()
        );
        assertEquals(
            Set.of(a.getId(), b.getId()),
            Set.of(ledger.get(0).get("projectId").asLong(), ledger.get(1).get("projectId").asLong())
        );
    }

    @Test
    void editingPeoplePreservesIdentityAndRejectsOtherOrganizations() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Student participant = student(admin);
        String studentBody = json.writeValueAsString(
            Map.of(
                "name",
                "Nome atualizado",
                "birthDate",
                "2000-02-02",
                "responsibleName",
                "Responsável atualizado",
                "imageConsent",
                false
            )
        );
        long count = students.count();
        mvc.perform(
            put("/api/students/" + participant.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(studentBody)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(participant.getId()))
            .andExpect(jsonPath("$.name").value("Nome atualizado"))
            .andExpect(jsonPath("$.imageConsent").value(false));
        assertEquals(count, students.count());
        Instructor instructor = instructors.save(
            new Instructor(admin.org(), "Original", "Área", "(11) 91234-5678")
        );
        String instructorBody = json.writeValueAsString(
            Map.of("name", "Instrutor atualizado", "area", "Música", "contact", "(11) 99876-5432")
        );
        mvc.perform(
            put("/api/instructors/" + instructor.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(instructorBody)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(instructor.getId()))
            .andExpect(jsonPath("$.name").value("Instrutor atualizado"));
        Actor stranger = actor("ADMIN", true, true, null);
        mvc.perform(
            put("/api/students/" + participant.getId())
                .header("Authorization", "Bearer " + stranger.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(studentBody)
        ).andExpect(status().isNotFound());
        mvc.perform(
            put("/api/instructors/" + instructor.getId())
                .header("Authorization", "Bearer " + stranger.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(instructorBody)
        ).andExpect(status().isNotFound());
        Actor reader = actor("INSTRUCTOR", true, true, admin.org());
        mvc.perform(
            put("/api/students/" + participant.getId())
                .header("Authorization", "Bearer " + reader.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(studentBody)
        ).andExpect(status().isForbidden());
        mvc.perform(
            put("/api/instructors/" + instructor.getId())
                .header("Authorization", "Bearer " + reader.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(instructorBody)
        ).andExpect(status().isForbidden());
        mvc.perform(
            put("/api/instructors/" + instructor.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Nome\",\"contact\":\"inválido\"}")
        ).andExpect(status().isBadRequest());
        assertEquals(
            "Instrutor atualizado",
            instructors.findById(instructor.getId()).orElseThrow().getName()
        );
        JsonNode photo = upload(admin, "STUDENT", participant.getId(), "2026-11-17", png());
        mvc.perform(
            put("/api/students/" + participant.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(studentBody)
        ).andExpect(status().isOk());
        mvc.perform(
            get(photo.get(0).get("url").asText()).header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isOk());
    }

    @Autowired
    WorkshopRepository workshopRepository;

    @Autowired
    MeetingRepository meetingRepository;

    @Test
    void meetingImagesAreScopedToTheirOrganizationAndDayArea() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Workshop workshop = workshopRepository.save(
            new Workshop(admin.org(), "Oficina teste", "Descrição")
        );
        ClassMeeting meeting = meetingRepository.save(
            new ClassMeeting(admin.org(), workshop, LocalDate.of(2026, 11, 17), "Encontro teste")
        );
        Actor educator = actor("INSTRUCTOR", true, false, admin.org());
        JsonNode photo = upload(educator, "MEETING", meeting.getId(), "2026-11-17", png());
        mvc.perform(
            get("/api/photos/MEETING/" + meeting.getId()).header(
                "Authorization",
                "Bearer " + educator.token()
            )
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
        Actor stranger = actor("ADMIN", true, true, null);
        mvc.perform(
            get(photo.get(0).get("url").asText()).header(
                "Authorization",
                "Bearer " + stranger.token()
            )
        ).andExpect(status().isNotFound());
        Actor management = actor("COORDINATOR", false, true, admin.org());
        mvc.perform(
            get(photo.get(0).get("url").asText()).header(
                "Authorization",
                "Bearer " + management.token()
            )
        ).andExpect(status().isForbidden());
    }

    @Test
    void staffExpenseLinksPersistAndRejectCrossOrganizationPeopleBeforeCreatingMoneyRecords() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        Project project = project(admin);
        Student participant = student(admin);
        Instructor instructor = instructors.save(
            new Instructor(admin.org(), "Instrutor staff", "Arte", "(11) 91234-5678")
        );
        var body = new LinkedHashMap<String, Object>();
        body.put("type", "EXPENSE");
        body.put("description", "Transporte da equipe");
        body.put("amount", 30);
        body.put("date", "2026-11-17");
        body.put("projectId", project.getId());
        body.put("category", "Transporte");
        body.put("staffExpense", true);
        body.put("instructorIds", List.of(instructor.getId()));
        body.put("memberIds", List.of(admin.member().getId()));
        body.put("participantIds", List.of(participant.getId()));
        mvc.perform(
            multipart("/api/ledger")
                .file(new MockMultipartFile("data", "", "text/plain", json.writeValueAsBytes(body)))
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isOk());
        JsonNode ledger = json.readTree(
            mvc
                .perform(get("/api/ledger").header("Authorization", "Bearer " + admin.token()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString()
        );
        assertTrue(ledger.get(0).get("staffExpense").asBoolean());
        assertTrue(ledger.get(0).get("team").asText().contains("Instrutor staff"));
        assertEquals(participant.getName(), ledger.get(0).get("participants").asText());
        Actor stranger = actor("ADMIN", true, true, null);
        Student other = student(stranger);
        body.put("participantIds", List.of(other.getId()));
        mvc.perform(
            multipart("/api/ledger")
                .file(new MockMultipartFile("data", "", "text/plain", json.writeValueAsBytes(body)))
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isNotFound());
        mvc.perform(get("/api/ledger").header("Authorization", "Bearer " + admin.token()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
        body.put("type", "DONATION");
        body.put("participantIds", List.of());
        mvc.perform(
            multipart("/api/ledger")
                .file(new MockMultipartFile("data", "", "text/plain", json.writeValueAsBytes(body)))
                .header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isBadRequest());
    }

    @Autowired
    org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    AttendanceRepository attendanceRepository;

    @Autowired
    PedagogicalNoteRepository noteRepository;

    ClassMeeting deletionMeeting(Actor actor) {
        Workshop workshop = workshopRepository.save(
            new Workshop(actor.org(), "Oficina preservada", "Descrição")
        );
        return meetingRepository.save(
            new ClassMeeting(
                actor.org(),
                workshop,
                LocalDate.of(2026, 11, 17),
                "Encontro a excluir"
            )
        );
    }

    Actor passwordActor() {
        Actor a = actor("ADMIN", true, true, null);
        a.member().setHash(passwordEncoder.encode("Senha-de-teste-123"));
        members.save(a.member());
        return a;
    }

    @Test
    void deleteRequiresCurrentPasswordAndRemovesOnlyMeetingDependentsAfterCommit() throws Exception {
        Actor admin = passwordActor();
        ClassMeeting meeting = deletionMeeting(admin);
        Student person = student(admin);
        attendanceRepository.save(new AttendanceRecord(admin.org(), meeting, person, true));
        noteRepository.save(new PedagogicalNote(admin.org(), meeting, "Autor", "Registro"));
        JsonNode image = upload(admin, "MEETING", meeting.getId(), "2026-11-17", png());
        Path file = uploadRoot
            .resolve("photos")
            .resolve(photos.findById(image.get(0).get("id").asLong()).orElseThrow().storageName);
        ClassMeeting other = deletionMeeting(admin);
        JsonNode otherImage = upload(admin, "MEETING", other.getId(), "2026-11-17", png());
        mvc.perform(
            get("/api/meetings/" + meeting.getId() + "/deletion-preview").header(
                "Authorization",
                "Bearer " + admin.token()
            )
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.attendance").value(1))
            .andExpect(jsonPath("$.notes").value(1))
            .andExpect(jsonPath("$.photos").value(1));
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmed\":true,\"password\":\"incorreta\"}")
        ).andExpect(status().isForbidden());
        assertTrue(meetingRepository.existsById(meeting.getId()));
        assertTrue(Files.exists(file));
        assertEquals(
            1,
            noteRepository.findByMeetingIdAndOrgId(meeting.getId(), admin.org().getId()).size()
        );
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmed\":false,\"password\":\"Senha-de-teste-123\"}")
        ).andExpect(status().isBadRequest());
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmed\":true,\"password\":\"Senha-de-teste-123\"}")
        ).andExpect(status().isNoContent());
        assertFalse(meetingRepository.existsById(meeting.getId()));
        assertFalse(Files.exists(file));
        assertTrue(
            attendanceRepository
                .findByMeetingIdAndOrgId(meeting.getId(), admin.org().getId())
                .isEmpty()
        );
        assertTrue(
            noteRepository.findByMeetingIdAndOrgId(meeting.getId(), admin.org().getId()).isEmpty()
        );
        assertTrue(photos.findById(image.get(0).get("id").asLong()).isEmpty());
        assertTrue(students.existsById(person.getId()));
        assertTrue(workshopRepository.existsById(meeting.getWorkshop().getId()));
        assertTrue(meetingRepository.existsById(other.getId()));
        mvc.perform(
            get(otherImage.get(0).get("url").asText()).header(
                "Authorization",
                "Bearer " + admin.token()
            )
        ).andExpect(status().isOk());
    }

    @Test
    void deletingMeetingsRejectsOtherOrganizationsAndReadOnlyUsers() throws Exception {
        Actor admin = passwordActor();
        ClassMeeting meeting = deletionMeeting(admin);
        Actor other = passwordActor();
        Actor reader = actor("INSTRUCTOR", true, true, admin.org());
        String body = "{\"confirmed\":true,\"password\":\"Senha-de-teste-123\"}";
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + other.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        ).andExpect(status().isNotFound());
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + reader.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        ).andExpect(status().isForbidden());
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        ).andExpect(status().isUnauthorized());
        assertTrue(meetingRepository.existsById(meeting.getId()));
    }

    @Test
    void repeatedWrongDeletionPasswordsAreLimited() throws Exception {
        Actor admin = passwordActor();
        ClassMeeting meeting = deletionMeeting(admin);
        for (int n = 0; n < 5; n++) mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmed\":true,\"password\":\"incorreta\"}")
        ).andExpect(status().isForbidden());
        mvc.perform(
            delete("/api/meetings/" + meeting.getId())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmed\":true,\"password\":\"Senha-de-teste-123\"}")
        ).andExpect(status().isTooManyRequests());
        assertTrue(meetingRepository.existsById(meeting.getId()));
    }

    JsonNode createLedger(Actor actor, Map<String, Object> input) throws Exception {
        return json.readTree(
            mvc
                .perform(
                    multipart("/api/ledger")
                        .file(
                            new MockMultipartFile(
                                "data",
                                "",
                                "text/plain",
                                json.writeValueAsBytes(input)
                            )
                        )
                        .header("Authorization", "Bearer " + actor.token())
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray()
        );
    }

    JsonNode ledgerRow(Actor actor, String kind, long id) throws Exception {
        var rows = json.readTree(
            mvc
                .perform(get("/api/ledger").header("Authorization", "Bearer " + actor.token()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray()
        );
        for (var row : rows)
            if (row.get("id").asLong() == id && kind.equals(row.get("type").asText())) return row;
        throw new AssertionError("Lançamento ausente");
    }

    org.springframework.test.web.servlet.ResultActions action(
        Actor actor,
        JsonNode row,
        Map<String, Object> input,
        MockMultipartFile proof
    ) throws Exception {
        var payload = new LinkedHashMap<>(input);
        payload.put("revision", row.path("revision").asLong());
        var request = multipart(
            "/api/ledger/" + row.get("type").asText() + "/" + row.get("id").asLong() + "/actions"
        ).file(
            new MockMultipartFile(
                "data",
                "data.json",
                "application/json",
                json.writeValueAsBytes(payload)
            )
        );
        request.header("Authorization", "Bearer " + actor.token());
        if (proof != null) request.file(proof);
        return mvc.perform(request);
    }

    @Test
    void expenseApprovalPaymentCorrectionAndReversal() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        LocalDate today = LocalDate.now();
        long id = createLedger(
            admin,
            Map.of(
                "type",
                "EXPENSE",
                "date",
                today,
                "dueDate",
                today.minusDays(1),
                "amount",
                100,
                "description",
                "Materiais",
                "category",
                "Consumo",
                "beneficiary",
                "Papelaria"
            )
        )
            .get("id")
            .asLong();
        JsonNode row = ledgerRow(admin, "EXPENSE", id);
        assertTrue(row.get("overdue").asBoolean());
        var partial = Map.<String, Object>of(
            "action",
            "SETTLE",
            "amount",
            40,
            "date",
            today,
            "accountName",
            "Banco",
            "method",
            "Pix"
        );
        action(admin, row, partial, null).andExpect(status().isConflict());
        String decision = "/api/expenses/" + id + "/";
        mvc.perform(
            post(decision + "approve").header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isOk());
        mvc.perform(
            post(decision + "reject").header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isConflict());
        row = ledgerRow(admin, "EXPENSE", id);
        assertEquals(0, row.get("settledAmount").asInt());
        action(actor("ADMIN", true, true, null), row, partial, null).andExpect(
            status().isNotFound()
        );
        action(actor("INSTRUCTOR", true, true, admin.org()), row, partial, null).andExpect(
            status().isForbidden()
        );
        action(
            admin,
            row,
            partial,
            new MockMultipartFile("file", "teste.exe", "application/octet-stream", new byte[] { 1 })
        ).andExpect(status().isBadRequest());
        action(
            admin,
            row,
            partial,
            new MockMultipartFile("file", "recibo.png", "image/png", png())
        ).andExpect(status().isOk());
        action(admin, row, partial, null).andExpect(status().isConflict());
        row = ledgerRow(admin, "EXPENSE", id);
        assertEquals("PARTIAL", row.get("status").asText());
        assertEquals(60, row.get("openAmount").asInt());
        assertEquals(1, row.get("attachments").size());
        long original = row.get("revision").asLong();
        action(admin, row, Map.of("action", "CANCEL", "reason", "Teste"), null).andExpect(
            status().isConflict()
        );
        var finalPayment = new LinkedHashMap<>(partial);
        finalPayment.put("amount", 60);
        action(admin, row, finalPayment, null).andExpect(status().isOk());
        row = ledgerRow(admin, "EXPENSE", id);
        assertEquals("PAID", row.get("status").asText());
        assertFalse(row.get("overdue").asBoolean());
        long second = row.get("revision").asLong();
        var reversal = Map.<String, Object>of(
            "action",
            "REVERSE",
            "reason",
            "Duplicidade",
            "eventId",
            original,
            "date",
            today
        );
        action(admin, row, reversal, null).andExpect(status().isOk());
        row = ledgerRow(admin, "EXPENSE", id);
        assertEquals(40, row.get("openAmount").asInt());
        action(admin, row, reversal, null).andExpect(status().isConflict());
        action(
            admin,
            row,
            Map.of("action", "REVERSE", "reason", "Correção", "eventId", second, "date", today),
            null
        ).andExpect(status().isOk());
        row = ledgerRow(admin, "EXPENSE", id);
        action(
            admin,
            row,
            Map.of(
                "action",
                "CORRECT",
                "reason",
                "Valor correto",
                "amount",
                120,
                "dueDate",
                today,
                "description",
                "Materiais extras"
            ),
            null
        ).andExpect(status().isOk());
        row = ledgerRow(admin, "EXPENSE", id);
        assertEquals("PENDING", row.get("status").asText());
        action(
            admin,
            row,
            Map.of("action", "CANCEL", "reason", "Pedido cancelado"),
            null
        ).andExpect(status().isOk());
        assertEquals(0, ledgerRow(admin, "EXPENSE", id).get("openAmount").asInt());
    }

    @Test
    void receivableInstallmentsAndImmediateReceipts() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        var forecast = Map.<String, Object>of(
            "type",
            "DONATION",
            "amount",
            100,
            "description",
            "Convênio",
            "date",
            "2025-01-01",
            "dueDate",
            "2025-01-31",
            "expected",
            true,
            "schedule",
            "INSTALLMENTS",
            "occurrences",
            3
        );
        var ids = createLedger(admin, forecast).get("ids");
        assertEquals(3, ids.size());
        var first = ledgerRow(admin, "DONATION", ids.get(0).asLong());
        assertEquals(33.34, first.get("openAmount").asDouble(), 0.00001);
        assertEquals(
            "2025-02-28",
            ledgerRow(admin, "DONATION", ids.get(1).asLong()).get("dueDate").asText()
        );
        assertEquals(
            "2025-03-31",
            ledgerRow(admin, "DONATION", ids.get(2).asLong()).get("dueDate").asText()
        );
        var receipt = Map.<String, Object>of(
            "action",
            "SETTLE",
            "amount",
            33.34,
            "date",
            "2025-02-02",
            "accountName",
            "Caixa",
            "method",
            "Dinheiro"
        );
        action(admin, first, receipt, null).andExpect(status().isOk());
        var paid = ledgerRow(admin, "DONATION", first.get("id").asLong());
        assertEquals("RECEIVED", paid.get("status").asText());
        assertEquals("2025-02-02", paid.get("lastMovement").asText());
        var recurring = new LinkedHashMap<>(forecast);
        recurring.put("schedule", "REPEAT");
        recurring.put("occurrences", 2);
        var repeated = createLedger(admin, recurring).get("ids");
        assertEquals(
            100,
            ledgerRow(admin, "DONATION", repeated.get(1).asLong()).get("openAmount").asInt()
        );
        var immediate = createLedger(
            admin,
            Map.of("type", "DONATION", "amount", 20, "description", "Doação", "date", "2025-02-03")
        )
            .get("id")
            .asLong();
        assertEquals(20, ledgerRow(admin, "DONATION", immediate).get("settledAmount").asInt());
    }

    @Test
    void originalReceiptsKeepTheirDateAndCanBeReversedOnce() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        var legacy = new Income();
        legacy.setOrg(admin.org());
        legacy.setType("CASH_IN");
        legacy.setAmount(new BigDecimal("20.00"));
        legacy.setDescription("Histórico");
        legacy.setReceivedDate(LocalDate.of(2024, 2, 3));
        incomeRepository.save(legacy);
        var row = ledgerRow(admin, "CASH_IN", legacy.getId());
        assertEquals(0, row.get("revision").asInt());
        assertEquals(20, row.get("settledAmount").asInt());
        assertEquals("2024-02-03", row.get("lastMovement").asText());
        var undo = Map.<String, Object>of(
            "action",
            "REVERSE",
            "date",
            "2025-01-01",
            "eventId",
            0,
            "reason",
            "Devolução"
        );
        action(admin, row, undo, null).andExpect(status().isOk());
        var reopened = ledgerRow(admin, "CASH_IN", legacy.getId());
        assertEquals("EXPECTED", reopened.get("status").asText());
        assertEquals(20, reopened.get("openAmount").asInt());
        assertEquals(2, reopened.get("history").size());
        action(admin, row, undo, null).andExpect(status().isConflict());
    }

    @Autowired
    IncomeRepository incomeRepository;

    @Test
    void logoutInvalidatesOnlyTheCurrentSession() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        mvc.perform(
            post("/api/auth/logout").header("Authorization", "Bearer " + admin.token())
        ).andExpect(status().isNoContent());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + admin.token())).andExpect(
            status().isUnauthorized()
        );
    }

    @Test
    void editingWorkshopAndArchivingParticipantPreservesEnrollment() throws Exception {
        Actor admin = actor("ADMIN", true, true, null);
        var workshop = workshopRepository.save(new Workshop(admin.org(), "Original", "Atividades"));
        Student member = student(admin);
        var auth = "Bearer " + admin.token();
        String path = "/api/workshops/" + workshop.getId();
        mvc.perform(
            post(path + "/enrollments")
                .header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("studentId", member.getId())))
        ).andExpect(status().isOk());
        mvc.perform(
            put("/api/students/" + member.getId())
                .header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("name", member.getName(), "active", false)))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));
        var otherWorkshop = workshopRepository.save(
            new Workshop(admin.org(), "Outra", "Atividades")
        );
        mvc.perform(
            post("/api/workshops/" + otherWorkshop.getId() + "/enrollments")
                .header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("studentId", member.getId())))
        ).andExpect(status().isConflict());
        mvc.perform(
            put(path)
                .header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsBytes(
                        Map.of(
                            "name",
                            "Oficina encerrada",
                            "description",
                            "Novo texto",
                            "active",
                            false
                        )
                    )
                )
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));
        mvc.perform(get(path + "/enrollments").header("Authorization", auth))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
        var project = project(admin);
        mvc.perform(
            put("/api/projects/" + project.getId())
                .header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsBytes(
                        Map.of("name", "Oficinas", "budget", 100, "funder", "Fundo")
                    )
                )
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.budget").value(100));
    }
}
