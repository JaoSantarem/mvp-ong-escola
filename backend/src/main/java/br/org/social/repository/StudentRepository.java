package br.org.social.repository;

import br.org.social.model.Student;

public interface StudentRepository
    extends org.springframework.data.jpa.repository.JpaRepository<Student, Long>
{
    public java.util.List<Student> findByOrgId(Long id);
    public java.util.Optional<Student> findByIdAndOrgId(Long id, Long org);
}
