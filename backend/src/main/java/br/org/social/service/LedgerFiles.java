package br.org.social.service;

import br.org.social.model.LedgerAttachment;
import br.org.social.repository.LedgerAttachmentRepository;
import java.io.IOException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LedgerFiles {

    final LedgerAttachmentRepository attachments;

    public LedgerFiles(LedgerAttachmentRepository attachments) {
        this.attachments = attachments;
    }

    public void save(
        Long o,
        String kind,
        Long id,
        Long eventId,
        List<MultipartFile> files
    ) throws IOException {
        if (files == null) files = List.of();
        if (files.size() > 5) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Envie até 5 anexos"
        );
        long size = 0;
        for (MultipartFile f : files) {
            size += f.getSize();
            String n = Objects.toString(f.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
            if (
                f.isEmpty() ||
                f.getSize() > 15 * 1024 * 1024 ||
                !n.matches(".*\\.(pdf|png|jpg|jpeg)$")
            ) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Use PDF, PNG ou JPG de até 15 MB"
            );
        }
        if (size > 30 * 1024 * 1024) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Os anexos devem somar até 30 MB"
        );
        for (MultipartFile f : files) {
            LedgerAttachment t = new LedgerAttachment();
            t.setOrgId(o);
            t.setKind(kind);
            t.setRecordId(id);
            t.setName(
                Objects.toString(f.getOriginalFilename(), "anexo").replaceAll("[\\\\/\\r\\n]", "_")
            );
            if (t.getName().length() > 200) t.setName(
                t.getName().substring(t.getName().length() - 200)
            );
            t.setContent(f.getBytes());
            t.eventId = eventId;
            attachments.save(t);
        }
    }
}
