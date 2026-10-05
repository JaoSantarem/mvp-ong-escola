package br.org.social;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.*;
@io.swagger.v3.oas.annotations.tags.Tag(name="Comprovantes de despesas", description="Envio e consulta dos documentos fiscais anexados às despesas") @RestController @RequestMapping("/api/expenses") class ExpenseDocumentApi {
 final Members members; final Expenses expenses; final Path root;
 ExpenseDocumentApi(Members m,Expenses e,@Value("${app.upload-dir:uploads}") String uploadDir){members=m;expenses=e;root=Paths.get(uploadDir).toAbsolutePath().normalize();}
 @PostMapping("/{id}/document") ResponseEntity<?> upload(@PathVariable Long id,@RequestParam("file") MultipartFile file,Authentication auth)throws Exception{
  Org org=members.findByEmailOrLogin(auth.getName(),auth.getName()).orElseThrow().org;
  String role=members.findByEmailOrLogin(auth.getName(),auth.getName()).orElseThrow().role;if(!Set.of("ADMIN","COORDINATOR").contains(role))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  Expense expense=expenses.findByIdAndOrgId(id,org.id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  if(file.isEmpty()||file.getSize()>15*1024*1024)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Arquivo vazio ou acima de 15 MB");
  String original=Paths.get(Objects.requireNonNullElse(file.getOriginalFilename(),"comprovante")).getFileName().toString();
  String ext=original.contains(".")?original.substring(original.lastIndexOf('.')+1).toLowerCase(Locale.ROOT):"";
  if(!Set.of("pdf","png","jpg","jpeg").contains(ext))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Envie PDF, PNG ou JPG");
  String key=UUID.randomUUID()+"."+ext;Path dir=root.resolve(String.valueOf(org.id)).normalize();Path target=dir.resolve(key).normalize();
  if(!target.startsWith(dir))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  Files.createDirectories(dir);file.transferTo(target);expense.documentKey=key;expense.documentName=original;expenses.save(expense);
  return ResponseEntity.ok(Map.of("name",original,"url","/api/expenses/"+id+"/document"));
 }
 @GetMapping("/{id}/document") ResponseEntity<Resource> download(@PathVariable Long id,Authentication auth)throws Exception{
  Org org=members.findByEmailOrLogin(auth.getName(),auth.getName()).orElseThrow().org;
  Expense expense=expenses.findByIdAndOrgId(id,org.id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  if(expense.documentKey==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Comprovante não anexado");
  Path dir=root.resolve(String.valueOf(org.id)).normalize();Path file=dir.resolve(expense.documentKey).normalize();
  if(!file.startsWith(dir)||!Files.isRegularFile(file))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  String type=Files.probeContentType(file);return ResponseEntity.ok().contentType(MediaType.parseMediaType(type==null?"application/octet-stream":type)).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(expense.documentName).build().toString()).body(new FileSystemResource(file));
 }
}
