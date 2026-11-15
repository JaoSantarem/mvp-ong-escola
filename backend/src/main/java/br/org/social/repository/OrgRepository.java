package br.org.social.repository;

import br.org.social.model.Org;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgRepository extends JpaRepository<Org, Long> {}
