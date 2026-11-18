package br.org.social.controller;

import br.org.social.model.AttendanceRecord;
import br.org.social.model.ClassMeeting;
import br.org.social.model.Enrollment;
import br.org.social.model.Org;
import br.org.social.model.PedagogicalNote;
import br.org.social.model.Student;
import br.org.social.model.Workshop;
import br.org.social.repository.AttendanceRepository;
import br.org.social.repository.EnrollmentRepository;
import br.org.social.repository.MeetingRepository;
import br.org.social.repository.MemberRepository;
import br.org.social.repository.PedagogicalNoteRepository;
import br.org.social.repository.StudentRepository;
import br.org.social.repository.WorkshopRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@io.swagger.v3.oas.annotations.tags.Tag(
    name = "Acadêmico",
    description = "Participantes, matrículas, encontros, frequência e registros pedagógicos"
)
@RestController
@RequestMapping("/api")
public class AcademicController {

    final MemberRepository members;
    final WorkshopRepository workshops;
    final StudentRepository students;
    final MeetingRepository meetings;
    final EnrollmentRepository enrollments;
    final AttendanceRepository attendances;
    final PedagogicalNoteRepository notes;

    public AcademicController(
        MemberRepository m,
        WorkshopRepository w,
        StudentRepository s,
        MeetingRepository mt,
        EnrollmentRepository en,
        AttendanceRepository at,
        PedagogicalNoteRepository n
    ) {
        members = m;
        workshops = w;
        students = s;
        meetings = mt;
        enrollments = en;
        attendances = at;
        notes = n;
    }

    public record StudentIn(
        String name,
        LocalDate birthDate,
        String responsibleName,
        boolean imageConsent
    ) {}

    public record StudentOut(
        Long id,
        String name,
        LocalDate birthDate,
        String responsibleName,
        boolean imageConsent
    ) {}

    public record MeetingIn(
        LocalDate meetingDate,
        String topic,
        java.time.LocalTime startTime,
        java.time.LocalTime endTime
    ) {}

    public record MeetingOut(
        Long id,
        LocalDate meetingDate,
        String topic,
        java.time.LocalTime startTime,
        java.time.LocalTime endTime
    ) {}

    public record EnrollmentIn(Long studentId) {}

    public record StudentRef(Long id, String name) {}

    public record EnrollmentOut(Long id, StudentRef student) {}

    public record Mark(Long studentId, boolean present) {}

    public record AttendanceOut(Long id, StudentRef student, boolean present) {}

    public record NoteIn(String text) {}

    public record NoteOut(Long id, String author, String text) {}

    public Org org(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow().getOrg();
    }

    public void manager(Authentication a) {
        if (
            !List.of("ADMIN", "COORDINATOR").contains(
                members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow().getRole()
            )
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ação restrita à coordenação");
    }

    public void educator(Authentication a) {
        if (
            !List.of("ADMIN", "COORDINATOR", "INSTRUCTOR").contains(
                members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow().getRole()
            )
        ) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Ação restrita à equipe pedagógica"
        );
    }

    public Workshop workshop(Long id, Long org) {
        return workshops
            .findByIdAndOrgId(id, org)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public ClassMeeting meeting(Long id, Long org) {
        return meetings
            .findByIdAndOrgId(id, org)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/students")
    public List<StudentOut> students(Authentication a) {
        return students
            .findByOrgId(org(a).getId())
            .stream()
            .map(s ->
                new StudentOut(
                    s.getId(),
                    s.getName(),
                    s.getBirthDate(),
                    s.getResponsibleName(),
                    s.getImageConsent()
                )
            )
            .toList();
    }

    @PostMapping("/students")
    public StudentOut addStudent(@RequestBody StudentIn i, Authentication a) {
        manager(a);
        Org o = org(a);
        validateStudent(i, o);
        Student s = students.save(
            new Student(o, i.name(), i.birthDate(), i.responsibleName(), i.imageConsent())
        );
        return new StudentOut(
            s.getId(),
            s.getName(),
            s.getBirthDate(),
            s.getResponsibleName(),
            s.getImageConsent()
        );
    }

    private void validateStudent(StudentIn i, Org o) {
        if (
            i.name() == null || i.name().isBlank() || i.name().trim().length() > 255
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe um nome válido de até 255 caracteres."
        );
        if (
            i.birthDate() != null && i.birthDate().isAfter(LocalDate.now())
        ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data de nascimento inválida");
        if (
            i.birthDate() != null &&
            java.time.Period.between(i.birthDate(), LocalDate.now()).getYears() < 18 &&
            "ONG".equals(o.getType())
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "O cadastro de participante menor de idade não é permitido para organização do tipo ONG"
        );
        if (
            i.birthDate() != null &&
            java.time.Period.between(i.birthDate(), LocalDate.now()).getYears() < 18 &&
            (i.responsibleName() == null || i.responsibleName().isBlank())
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe responsável para participante menor de idade"
        );
    }

    @PutMapping("/students/{id}")
    public StudentOut updateStudent(
        @PathVariable Long id,
        @RequestBody StudentIn i,
        Authentication a
    ) {
        manager(a);
        Org o = org(a);
        Student s = students
            .findByIdAndOrgId(id, o.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validateStudent(i, o);
        s.setName(i.name().trim());
        s.setBirthDate(i.birthDate());
        s.setResponsibleName(i.responsibleName());
        s.setImageConsent(i.imageConsent());
        students.save(s);
        return new StudentOut(
            s.getId(),
            s.getName(),
            s.getBirthDate(),
            s.getResponsibleName(),
            s.getImageConsent()
        );
    }

    @GetMapping("/workshops/{id}/meetings")
    public List<MeetingOut> meetings(@PathVariable Long id, Authentication a) {
        return meetings
            .findByWorkshopIdAndOrgId(id, org(a).getId())
            .stream()
            .map(m ->
                new MeetingOut(
                    m.getId(),
                    m.getMeetingDate(),
                    m.getTopic(),
                    m.getStartTime(),
                    m.getEndTime()
                )
            )
            .toList();
    }

    @PostMapping("/workshops/{id}/meetings")
    public MeetingOut addMeeting(
        @PathVariable Long id,
        @RequestBody MeetingIn i,
        Authentication a
    ) {
        manager(a);
        Org o = org(a);
        if (
            i.meetingDate() == null ||
            i.startTime() == null ||
            i.endTime() == null ||
            !i.endTime().isAfter(i.startTime())
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe a data e um horário de término posterior ao início"
        );
        ClassMeeting m = new ClassMeeting(o, workshop(id, o.getId()), i.meetingDate(), i.topic());
        m.setStartTime(i.startTime());
        m.setEndTime(i.endTime());
        m = meetings.save(m);
        return new MeetingOut(
            m.getId(),
            m.getMeetingDate(),
            m.getTopic(),
            m.getStartTime(),
            m.getEndTime()
        );
    }

    @GetMapping("/workshops/{id}/enrollments")
    public List<EnrollmentOut> enrollments(@PathVariable Long id, Authentication a) {
        Org o = org(a);
        workshop(id, o.getId());
        return enrollments
            .findByWorkshopIdAndOrgId(id, o.getId())
            .stream()
            .map(e ->
                new EnrollmentOut(
                    e.getId(),
                    new StudentRef(e.getStudent().getId(), e.getStudent().getName())
                )
            )
            .toList();
    }

    @PostMapping("/workshops/{id}/enrollments")
    public EnrollmentOut enroll(
        @PathVariable Long id,
        @RequestBody EnrollmentIn i,
        Authentication a
    ) {
        manager(a);
        Org o = org(a);
        Workshop w = workshop(id, o.getId());
        Student s = students
            .findByIdAndOrgId(i.studentId(), o.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (
            enrollments.existsByWorkshopIdAndStudentIdAndOrgId(id, s.getId(), o.getId())
        ) throw new ResponseStatusException(HttpStatus.CONFLICT, "Participante já matriculado");
        Enrollment e = enrollments.save(new Enrollment(o, w, s));
        return new EnrollmentOut(e.getId(), new StudentRef(s.getId(), s.getName()));
    }

    @GetMapping("/meetings/{id}/attendance")
    public List<AttendanceOut> attendance(@PathVariable Long id, Authentication a) {
        Org o = org(a);
        ClassMeeting m = meeting(id, o.getId());
        Map<Long, AttendanceOut> roster = new LinkedHashMap<>();
        if (
            !Boolean.TRUE.equals(m.getCustomRoster())
        ) for (Enrollment e : enrollments.findByWorkshopIdAndOrgId(
            m.getWorkshop().getId(),
            o.getId()
        ))
            roster.put(
                e.getStudent().getId(),
                new AttendanceOut(
                    null,
                    new StudentRef(e.getStudent().getId(), e.getStudent().getName()),
                    false
                )
            );
        for (AttendanceRecord r : attendances.findByMeetingIdAndOrgId(id, o.getId()))
            roster.put(
                r.getStudent().getId(),
                new AttendanceOut(
                    r.getId(),
                    new StudentRef(r.getStudent().getId(), r.getStudent().getName()),
                    r.getPresent()
                )
            );
        return new ArrayList<>(roster.values());
    }

    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/meetings/{id}/attendance")
    public List<AttendanceOut> mark(
        @PathVariable Long id,
        @RequestBody List<Mark> marks,
        Authentication a
    ) {
        educator(a);
        Org o = org(a);
        ClassMeeting m = meeting(id, o.getId());
        Set<Long> ids = new HashSet<>();
        for (Mark mark : marks) {
            if (
                mark.studentId() == null || !ids.add(mark.studentId())
            ) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Aluno duplicado ou inválido"
            );
            students
                .findByIdAndOrgId(mark.studentId(), o.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        }
        for (AttendanceRecord existing : attendances.findByMeetingIdAndOrgId(id, o.getId()))
            if (!ids.contains(existing.getStudent().getId())) attendances.delete(existing);
        m.setCustomRoster(true);
        meetings.save(m);
        List<AttendanceOut> out = new ArrayList<>();
        for (Mark mark : marks) {
            Student s = students
                .findByIdAndOrgId(mark.studentId(), o.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            AttendanceRecord r = attendances
                .findByMeetingIdAndStudentIdAndOrgId(id, s.getId(), o.getId())
                .orElse(new AttendanceRecord(o, m, s, mark.present()));
            r.setPresent(mark.present());
            r = attendances.save(r);
            out.add(
                new AttendanceOut(r.getId(), new StudentRef(s.getId(), s.getName()), r.getPresent())
            );
        }
        return out;
    }

    @GetMapping("/meetings/{id}/notes")
    public List<NoteOut> notes(@PathVariable Long id, Authentication a) {
        Org o = org(a);
        meeting(id, o.getId());
        return notes
            .findByMeetingIdAndOrgId(id, o.getId())
            .stream()
            .map(n -> new NoteOut(n.getId(), n.getAuthor(), n.getText()))
            .toList();
    }

    @PostMapping("/meetings/{id}/notes")
    public NoteOut addNote(@PathVariable Long id, @RequestBody NoteIn i, Authentication a) {
        educator(a);
        Org o = org(a);
        PedagogicalNote n = notes.save(
            new PedagogicalNote(o, meeting(id, o.getId()), a.getName(), i.text())
        );
        return new NoteOut(n.getId(), n.getAuthor(), n.getText());
    }
}
